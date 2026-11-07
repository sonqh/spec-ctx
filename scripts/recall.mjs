#!/usr/bin/env node
// REQ-STAT-006 REQ-STAT-007 REQ-STAT-008 the recall benchmark of ADR-007 item 6 (change 054).
// It runs `context <task>` of this repository's dist/cli.js once per labelled task and compares the printed entries with the labels.
// Node APIs only (ADR-001). See openspec/changes/archive/*-054-recall-benchmark/design.md for D1 to D10.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, platform, arch } from "node:os";
import { basename, dirname, join, matchesGlob, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const CLI = join(REPO, "dist/cli.js");
const KINDS = ["reqs", "code", "tests"];
const CANDIDATES = ["archived", "open"];

const USAGE = `usage:
  recall.mjs --labels <file> --root <dir> [--labels <file> --root <dir>] [--out <dir>] [--date <yyyy-mm-dd>] [--runs <n>]
  recall.mjs --labels <file> --root <dir> --check
  recall.mjs --labels <file> --check-schema
  recall.mjs --root <dir> --sample <n> --seed <s> [--candidates archived|open] [--changes <key,key>]
Exit codes: 0 success, 2 bad input, 3 internal error.`;

class InputError extends Error {}
const fail = (msg) => {
  throw new InputError(msg);
};

function parseArgs(argv) {
  const a = { labels: [], roots: [], out: null, date: null, runs: 5, sample: null, seed: null, changes: null, candidates: "archived", check: false, checkSchema: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => {
      if (i + 1 >= argv.length) fail(`${k} needs a value`);
      return argv[++i];
    };
    if (k === "--labels") a.labels.push(resolve(v()));
    else if (k === "--root") a.roots.push(resolve(v()));
    else if (k === "--out") a.out = resolve(v());
    else if (k === "--date") a.date = v();
    else if (k === "--runs") a.runs = Number(v());
    else if (k === "--sample") a.sample = Number(v());
    else if (k === "--seed") a.seed = Number(v());
    else if (k === "--changes") a.changes = v().split(",").filter(Boolean);
    else if (k === "--candidates") a.candidates = v();
    else if (k === "--check") a.check = true;
    else if (k === "--check-schema") a.checkSchema = true;
    else if (k === "--help" || k === "-h") a.help = true;
    else fail(`unknown argument ${k}`);
  }
  if (a.date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(a.date)) fail(`--date must be yyyy-mm-dd, not ${a.date}`);
  if (!Number.isInteger(a.runs) || a.runs < 1) fail("--runs must be a whole number of 1 or more");
  if (!CANDIDATES.includes(a.candidates)) fail(`--candidates must be archived or open, not ${a.candidates}`);
  return a;
}

/** The environment of a spawned command: no SPECCTX_RERUN and no GIT_ variable (054/D7). */
function cleanEnv() {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined && k !== "SPECCTX_RERUN" && !k.startsWith("GIT_")) env[k] = v;
  return env;
}

function git(root, ...args) {
  const r = spawnSync("git", args, { cwd: root, env: cleanEnv(), encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) fail(`git ${args[0]} failed in ${root}: ${(r.stderr || "").trim()}`);
  return r.stdout;
}

function cli(root, args) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd: root, env: cleanEnv(), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

async function scanConfig(root) {
  const { loadConfig } = await import(join(REPO, "dist/config.js"));
  const c = loadConfig(root);
  return { code: c.scan.code, tests: c.scan.tests, ignore: c.scan.ignore };
}

const matchAny = (file, globs) => globs.some((g) => matchesGlob(file, g));

/** The kind of a repo path by the scan globs of the root (054/D1), or null. */
function kindOf(file, scan) {
  if (matchAny(file, scan.ignore)) return null;
  if (matchAny(file, scan.tests)) return "tests";
  if (matchAny(file, scan.code)) return "code";
  return null;
}

function loadIndex(root) {
  const r = cli(root, ["build"]);
  if (r.status !== 0) fail(`build failed in ${root}: ${(r.stderr || "").trim()}`);
  return JSON.parse(readFileSync(join(root, ".ctx/index.json"), "utf8")).entries;
}

const keyOf = (task) => task.slice(0, task.indexOf("/"));

/**
 * The candidate tasks (054/D5). Mode archived: done tasks of archived changes whose commits edit a file under the code or tests globs.
 * It reads the commits from git log, never from tags or evidence. Mode open: open tasks of active changes, with no commit filter.
 */
function candidates(root, entries, scan, changes, mode = "archived") {
  if (mode === "open") {
    const out = entries.filter((e) => e.kind === "task" && e.status !== "done" && !e.file.includes("/changes/archive/") && (!changes || changes.includes(keyOf(e.id)))).map((e) => e.id);
    return [...new Set(out)].sort();
  }
  if (git(root, "rev-parse", "--is-shallow-repository").trim() === "true") fail(`${root} is a shallow clone. The sample needs the full history`);
  const byFolder = new Map();
  for (const e of entries) {
    if (e.kind !== "task" || e.status !== "done" || !e.file.includes("/changes/archive/")) continue;
    if (changes && !changes.includes(keyOf(e.id))) continue;
    const folder = dirname(e.file);
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder).push(e.id);
  }
  const out = [];
  for (const [folder, ids] of [...byFolder].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const name = basename(folder).replace(/^\d{4}-\d{2}-\d{2}-/, "");
    const shas = git(root, "log", "--format=%H", "--", folder, `openspec/changes/${name}`).split("\n").filter(Boolean);
    if (shas.length === 0) continue;
    const files = git(root, "show", "--name-only", "--pretty=format:", ...shas).split("\n").filter(Boolean);
    if (files.some((f) => kindOf(f, scan) !== null)) out.push(...ids);
  }
  return [...new Set(out)].sort();
}

/** A seeded pick of n IDs from the sorted candidates (mulberry32 and Fisher-Yates), printed in sorted order. */
function pick(ids, n, seed) {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n).sort();
}

const isStrings = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");

/** 054/D4 the fields of a label file. */
function checkSchema(file) {
  const name = basename(file);
  let d;
  try {
    d = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    fail(`${name}: not a JSON file (${e.message})`);
  }
  for (const [k, t] of [["repo", "string"], ["budget", "number"], ["seed", "number"], ["sample", "number"]]) if (typeof d[k] !== t) fail(`${name}: the field ${k} must be a ${t}`);
  if (d.commit !== undefined && typeof d.commit !== "string") fail(`${name}: the field commit must be a string`);
  if (d.changes !== undefined && !isStrings(d.changes)) fail(`${name}: the field changes must be a list of strings`);
  if (d.candidates !== undefined && !CANDIDATES.includes(d.candidates)) fail(`${name}: the field candidates must be archived or open`);
  if (d.candidates === "open" && typeof d.commit !== "string") fail(`${name}: candidates open needs the field commit. The open tasks change as the project moves on`);
  if (!Array.isArray(d.tasks) || d.tasks.length === 0) fail(`${name}: the field tasks must be a list that is not empty`);
  for (const t of d.tasks) {
    if (typeof t.task !== "string") fail(`${name}: a task misses the field task`);
    for (const k of KINDS) if (!isStrings(t[k])) fail(`${name}: task ${t.task} misses the field ${k}`);
    if (typeof t.note !== "string") fail(`${name}: task ${t.task} misses the field note`);
  }
  if (d.tasks.length !== d.sample) fail(`${name}: the field sample is ${d.sample}, but the file holds ${d.tasks.length} tasks`);
  return d;
}

/** 054/D4 the four checks against the root. */
async function checkAgainst(file, d, root) {
  const name = basename(file);
  if (!existsSync(join(root, "openspec"))) fail(`${name}: ${root} is not an OpenSpec project`);
  const head = git(root, "rev-parse", "HEAD").trim();
  if (d.commit !== undefined && d.commit !== head) fail(`${name}: commit ${d.commit} is not HEAD ${head} of ${root}`);
  const scan = await scanConfig(root);
  const entries = loadIndex(root);
  const tasks = new Set(entries.filter((e) => e.kind === "task").map((e) => e.id));
  const reqs = new Set(entries.filter((e) => e.kind === "req").map((e) => e.id));
  for (const t of d.tasks) if (!tasks.has(t.task)) fail(`${name}: task ${t.task} is not in the index of ${root}`);
  for (const t of d.tasks) {
    for (const r of t.reqs) if (!reqs.has(r)) fail(`${name}: task ${t.task} names ${r}, which is not in the index`);
    for (const k of ["code", "tests"])
      for (const f of t[k]) {
        if (!existsSync(join(root, f))) fail(`${name}: task ${t.task} names ${f}, which does not exist`);
        if (kindOf(f, scan) !== k) fail(`${name}: task ${t.task} lists ${f} under ${k}, but the scan globs make it ${kindOf(f, scan) ?? "no scanned file"}`);
      }
  }
  const want = pick(candidates(root, entries, scan, d.changes ?? null, d.candidates ?? "archived"), d.sample, d.seed);
  const have = d.tasks.map((t) => t.task).sort();
  if (want.join(",") !== have.join(",")) fail(`${name}: the tasks are not the seeded sample. sample ${d.sample} seed ${d.seed} gives ${want.join(", ")}`);
  return head;
}

/**
 * 054/D2 the header lines of the text. The truncated line never matches.
 * REQ-STAT-007 a header also says if its line ends with the marker and if it is a `named by` card (060/D7).
 */
function headers(text) {
  const out = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("-- ")) continue;
    const f = line.slice(3).split(" | ");
    const loc = f[1] ?? "";
    const at = loc.lastIndexOf(":");
    out.push({ id: f[0], path: at < 0 ? loc : loc.slice(0, at), marked: line.endsWith(" | body omitted"), named: (f[3] ?? "").startsWith("named by "), reason: f[3] ?? "" });
  }
  return out;
}

function context(root, task, budget) {
  const t0 = process.hrtime.bigint();
  const r = cli(root, ["context", task, "--json", "--budget", String(budget)]);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  if (r.status !== 0) {
    const e = new Error(`context ${task} exited ${r.status} in ${root}: ${(r.stderr || "").trim()}`);
    throw e;
  }
  return { json: JSON.parse(r.stdout), ms };
}

const round = (x) => (x === null ? null : Math.round(x * 1e4) / 1e4);
const ratio = (a, b) => (b === 0 ? null : round(a / b));

function p95(values) {
  const s = [...values].sort((a, b) => a - b);
  return round(s[Math.max(0, Math.ceil(0.95 * s.length) - 1)]);
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function score(file, d, root, head, runs) {
  const timed = [];
  const perTask = [];
  const labels = { total: 0, reqs: 0, code: 0, tests: 0 };
  const matched = { total: 0, reqs: 0, code: 0, tests: 0 };
  // REQ-STAT-007 the matches whose header ends with the marker, and the matches that need no `named by` card
  const cardOnly = { total: 0, reqs: 0, code: 0, tests: 0 };
  const unnamed = { total: 0, reqs: 0, code: 0, tests: 0 };
  let citedBodyLost = 0;
  // REQ-STAT-008 body_recall: the labelled requirements that the task cites, and the ones among them whose full body printed
  const bodies = { cited: 0, printed: 0 };
  let omittedIds = 0;
  let truncatedIds = 0;
  context(root, d.tasks[0].task, d.budget); // warm-up
  for (const t of d.tasks) {
    const { json } = context(root, t.task, d.budget);
    const h = headers(json.text);
    // a cited requirement of this task whose card lost its body
    const lost = h.filter((x) => x.marked && x.reason === `ref from ${t.task}`).length;
    citedBodyLost += lost;
    const misses = [];
    let citedLabelled = 0;
    let bodyPrinted = 0;
    let hit = 0;
    let all = 0;
    for (const k of KINDS)
      for (const label of t[k]) {
        all++;
        labels.total++;
        labels[k]++;
        const found = h.filter((x) => (k === "reqs" ? x.id === label : x.path === label));
        const cites = k === "reqs" ? found.filter((x) => x.reason === `ref from ${t.task}`) : [];
        if (cites.length) {
          citedLabelled++;
          if (cites.some((x) => !x.marked)) bodyPrinted++;
        }
        if (found.length) {
          hit++;
          matched.total++;
          matched[k]++;
          if (found.every((x) => x.marked)) {
            cardOnly.total++;
            cardOnly[k]++;
          }
          if (found.some((x) => !x.named)) {
            unnamed.total++;
            unnamed[k]++;
          }
        } else misses.push(label);
      }
    bodies.cited += citedLabelled;
    bodies.printed += bodyPrinted;
    omittedIds += json.body_omitted.length;
    truncatedIds += json.omitted.length;
    for (let i = 0; i < runs; i++) timed.push(context(root, t.task, d.budget).ms);
    perTask.push({ task: t.task, chars: json.chars, matched: hit, total: all, cited_body_lost: lost, cited_labelled: citedLabelled, body_printed: bodyPrinted, misses });
  }
  const chars = perTask.map((t) => t.chars);
  return {
    repo: d.repo,
    root_commit: head,
    labels_file: basename(file),
    labels_sha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
    budget: d.budget,
    tasks: d.tasks.length,
    labels,
    matched,
    recall: ratio(matched.total, labels.total),
    recall_by_kind: Object.fromEntries(KINDS.map((k) => [k, ratio(matched[k], labels[k])])),
    card_only: cardOnly,
    cited_body_lost: citedBodyLost,
    body_recall: ratio(bodies.printed, bodies.cited),
    body_counts: bodies,
    // the proxy of ADR-010 item 1: the mean count of body_omitted IDs for one context run, and of IDs cut to truncated
    body_omitted_mean: round(omittedIds / d.tasks.length),
    truncated_mean: round(truncatedIds / d.tasks.length),
    matched_without_named: unnamed,
    recall_without_named: ratio(unnamed.total, labels.total),
    recall_without_named_by_kind: Object.fromEntries(KINDS.map((k) => [k, ratio(unnamed[k], labels[k])])),
    complete: perTask.filter((t) => t.misses.length === 0).length,
    chars: { median: median(chars), max: Math.max(...chars) },
    runs,
    p95_ms: p95(timed),
    per_task: perTask,
  };
}

const show = (x) => (x === null ? "n/a" : x.toFixed(2));

function markdown(r) {
  const out = [`# Recall benchmark ${r.date}`, "", "`scripts/recall.mjs` wrote this file (REQ-STAT-006). Recall counts the labels that a `context <task>` header line names, within the budget.", ""];
  out.push(`- Machine: ${r.platform} ${r.arch}, ${r.cpu}. Node ${r.node}.`);
  out.push(`- spec-ctx commit: ${r.spec_ctx_commit}.`);
  out.push("");
  for (const x of r.repos) {
    out.push(`## ${x.repo}`, "");
    out.push(`- Root commit: ${x.root_commit}. Labels: \`${x.labels_file}\`, sha256 ${x.labels_sha256}.`);
    out.push(`- Budget: ${x.budget} chars. Timed runs per task: ${x.runs}.`, "");
    out.push("| recall | reqs | code | tests | card_only | complete tasks | labels | median chars | max chars | p95 ms |");
    out.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    const co = x.card_only;
    out.push(
      `| ${show(x.recall)} (${x.matched.total}/${x.labels.total}) | ${show(x.recall_by_kind.reqs)} (${x.matched.reqs}/${x.labels.reqs}) | ${show(x.recall_by_kind.code)} (${x.matched.code}/${x.labels.code}) | ${show(x.recall_by_kind.tests)} (${x.matched.tests}/${x.labels.tests}) | ${co.total} (reqs ${co.reqs}, code ${co.code}, tests ${co.tests}) | ${x.complete} of ${x.tasks} | ${x.labels.total} | ${x.chars.median} | ${x.chars.max} | ${x.p95_ms} |`,
    );
    out.push("", `Without the \`named by\` cards: recall ${show(x.recall_without_named)} (${x.matched_without_named.total}/${x.labels.total}), code ${show(x.recall_without_named_by_kind.code)}, tests ${show(x.recall_without_named_by_kind.tests)}. Cited requirements that lost their body: ${x.cited_body_lost}. body_recall ${show(x.body_recall)} (${x.body_counts.printed}/${x.body_counts.cited}). Mean body_omitted IDs per run: ${x.body_omitted_mean}. Mean truncated IDs per run: ${x.truncated_mean}.`);
    out.push("", "| task | matched | chars | misses |", "| --- | --- | --- | --- |");
    for (const t of x.per_task) out.push(`| ${t.task} | ${t.matched} of ${t.total} | ${t.chars} | ${t.misses.length ? t.misses.map((m) => `\`${m}\``).join(", ") : "none"} |`);
    out.push("");
  }
  return out.join("\n");
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function main(argv) {
  const a = parseArgs(argv);
  if (a.help) {
    process.stdout.write(USAGE + "\n");
    return 0;
  }
  if (!existsSync(CLI)) fail(`${CLI} is missing. Run: bun run build`);
  if (a.sample !== null) {
    if (a.roots.length !== 1 || !Number.isInteger(a.seed) || !Number.isInteger(a.sample)) fail("--sample needs one --root, a whole --sample, and a whole --seed");
    const root = a.roots[0];
    const scan = await scanConfig(root);
    process.stdout.write(pick(candidates(root, loadIndex(root), scan, a.changes, a.candidates), a.sample, a.seed).map((t) => t + "\n").join(""));
    return 0;
  }
  if (a.labels.length === 0) fail("give --labels <file>");
  const files = a.labels.map((f) => [f, checkSchema(f)]);
  if (a.checkSchema) {
    process.stdout.write(files.map(([f]) => `schema ok: ${basename(f)}\n`).join(""));
    return 0;
  }
  if (a.roots.length !== a.labels.length) fail("give one --root for each --labels");
  const heads = [];
  for (const [i, [f, d]] of files.entries()) heads.push(await checkAgainst(f, d, a.roots[i]));
  if (a.check) {
    process.stdout.write(files.map(([f]) => `check ok: ${basename(f)}\n`).join(""));
    return 0;
  }
  const report = {
    date: a.date ?? today(),
    node: process.versions.node,
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0]?.model ?? "unknown",
    spec_ctx_commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO, env: cleanEnv(), encoding: "utf8" }).trim(),
    repos: files.map(([f, d], i) => score(f, d, a.roots[i], heads[i], a.runs)),
  };
  const out = a.out ?? join(REPO, "docs/metrics");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `recall-${report.date}.json`), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(join(out, `recall-${report.date}.md`), markdown(report));
  for (const x of report.repos) process.stdout.write(`${x.repo}: recall ${show(x.recall)} (${x.matched.total}/${x.labels.total}), p95 ${x.p95_ms} ms\n`);
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (e) => {
    process.stderr.write(`recall: ${e.message}\n`);
    process.exit(e instanceof InputError ? 2 : 3);
  },
);
