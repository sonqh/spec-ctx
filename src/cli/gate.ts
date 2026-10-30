// REQ-CLI-009 REQ-CLI-004 specctx gate: check, the baseline against the merge base, both linters, openspec validate, spec length. Stops at the first failure.
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import type { Io } from "../main.ts";
import { anyMatch, globRe } from "../util/glob.ts";
import { cmpStr } from "../util/pystr.ts";

const SKIP = new Set(["node_modules", ".git", ".ctx", "dist", "build"]);

export function markdownFiles(root: string, globs: string): string[] {
  const res = globs.split(/\s+/).filter(Boolean).map(globRe);
  const out: string[] = [];
  const walk = (abs: string, rel: string): void => {
    let names: string[];
    try {
      names = readdirSync(abs).sort(cmpStr);
    } catch {
      return;
    }
    for (const n of names) {
      const p = join(abs, n);
      const r = rel ? `${rel}/${n}` : n;
      let dir = false;
      try {
        dir = statSync(p).isDirectory();
      } catch {
        continue;
      }
      if (dir) {
        if (!SKIP.has(n)) walk(p, r);
      } else if (anyMatch(res, r)) out.push(r);
    }
  };
  walk(root, "");
  return out;
}

export interface GateOpts {
  strict: boolean;
  markdown: string;
  /** With --json the lint detail is not cut at LINT_DETAIL_CAP. */
  json?: boolean;
  /** REQ-DIST-002 the command that runs OpenSpec, from [gate] openspec or SPECCTX_OPENSPEC (018/D2). */
  openspec: string;
  /** REQ-ADOPT-008 the ref whose merge base with HEAD holds the baseline to compare with, from [gate] base (020/D2). */
  base: string;
  /** REQ-ADOPT-008 the commit subject to test for `baseline:`. Absent, the step reads git (020/D4). */
  baselineSubject?: string;
  check: () => Promise<{ code: number; out: string }>;
}

export const GATE_LOG = ".ctx/gate-log.jsonl";

/** REQ-STAT-005 the gate steps in order. The log names the step that failed. */
/** REQ-CLI-004 the lint detail stops here unless --json asks for every line. */
export const LINT_DETAIL_CAP = 50;

export const GATE_STEPS = ["check", "baseline", "lint tells", "lint ste", "validate", "spec-length"] as const;
type Step = (typeof GATE_STEPS)[number];

/** REQ-STAT-005 one JSON line per gate run, after the last step or at the first failure. */
export function appendGateLog(root: string, line: { at: string; ok: boolean; failed_step: string | null; duration_s: number; steps: string[] }): void {
  mkdirSync(join(root, ".ctx"), { recursive: true });
  const sorted = { at: line.at, duration_s: line.duration_s, failed_step: line.failed_step, ok: line.ok, steps: line.steps };
  appendFileSync(join(root, GATE_LOG), JSON.stringify(sorted) + "\n");
}

export async function runGate(root: string, o: GateOpts, io: Io): Promise<number> {
  const start = Date.now();
  const ran: Step[] = [];
  const r = await gateSteps(root, o, io, ran);
  const { isoNow } = await import("../util/time.ts");
  appendGateLog(root, { at: isoNow(), ok: r === null, failed_step: r, duration_s: Math.round((Date.now() - start) / 1000), steps: [...ran] });
  return r === null ? 0 : 1;
}

/** The gate steps. Returns null when every step passed, else the name of the failed step. */
async function gateSteps(root: string, o: GateOpts, io: Io, ran: Step[]): Promise<Step | null> {
  // gate 1: build and check
  ran.push("check");
  const c = await o.check();
  if (c.code !== 0) {
    io.out("check: fail\n" + c.out);
    return "check";
  }
  io.out(`check: ok${o.strict ? " (strict)" : ""}\n`);

  // gate 2: REQ-ADOPT-008 the baseline may not gain entries against the merge base (020/D1 to D4)
  ran.push("baseline");
  const b = await baselineStep(root, o);
  io.out(b.text);
  if (!b.ok) return "baseline";

  // gate 3: REQ-LINT-003 both linters of this package on the markdown globs. No python3.
  // REQ-ADOPT-007 the step fails only on a count above its baseline line.
  const { lintCounts, lintRises } = await import("../lint/counts.ts");
  const { readBaseline } = await import("../baseline/baseline.ts");
  ran.push("lint tells", "lint ste");
  const { counts, files } = lintCounts(root, o.markdown);
  const base = readBaseline(root);
  const rises = lintRises(counts, base);
  const baselined = [...base ?? []].filter((l) => l.startsWith("lint ")).length;
  if (rises.length) {
    const newFindings = rises.reduce((a, r) => a + r.current - r.baseline, 0);
    const inFiles = new Set(rises.map((r) => r.key.split(" ")[1])).size;
    const lines = rises.map((r) => `${r.key.slice(5).replace(" ", "  ")}  ${r.current} (baseline ${r.baseline})`);
    const shown = o.json ? lines : lines.slice(0, LINT_DETAIL_CAP);
    const more = lines.length - shown.length;
    io.out(`linters: fail, ${newFindings} new finding(s) in ${inFiles} file(s)\n` + shown.map((l) => l + "\n").join("") + (more ? `... ${more} more line(s)\n` : ""));
    return rises.some((r) => r.key.includes(" tells:")) ? "lint tells" : "lint ste";
  }
  io.out(`linters: ok (${files} file(s)${baselined ? `, ${baselined} baselined` : ""})\n`);

  ran.push("validate");
  // gate 4: openspec validate with the command the caller resolved (018/D2)
  const v = spawnSync("/bin/sh", ["-c", `${o.openspec} validate --all${o.strict ? " --strict" : ""} --no-interactive`], { cwd: root, encoding: "utf8" });
  if (v.status !== 0) {
    io.out("validate: fail\n" + (v.stdout ?? "") + (v.stderr ?? ""));
    return "validate";
  }
  io.out(`validate: ok${o.strict ? " (strict)" : ""}\n`);

  ran.push("spec-length");
  // gate 5: the length of every requirement in the deltas of active changes
  const long = longRequirements(root);
  if (long.length) {
    io.out(long.map((l) => `spec-length: fail ${l.id} ${l.chars} chars\n`).join(""));
    return "spec-length";
  }
  io.out("spec-length: ok\n");
  return null;
}

/** REQ-ADOPT-008 the baseline step: skipped, ok, or fail with the new entries (020/D3). */
async function baselineStep(root: string, o: GateOpts): Promise<{ ok: boolean; text: string }> {
  const { baseAtMergeBase, headSubjects, isBaselineSubject, newEntries } = await import("../baseline/ratchet.ts");
  const { readBaseline } = await import("../baseline/baseline.ts");
  const subjects = o.baselineSubject !== undefined ? [o.baselineSubject] : headSubjects(root);
  if (subjects.some(isBaselineSubject)) return { ok: true, text: "baseline: ok (baseline: commit)\n" };
  const base = baseAtMergeBase(root, o.base);
  if ("skip" in base) return { ok: true, text: `baseline: skipped (${base.skip})\n` };
  const current = [...readBaseline(root) ?? []];
  const fresh = newEntries(current, base.lines);
  if (!fresh.length) return { ok: true, text: "baseline: ok\n" };
  const shown = o.json ? fresh : fresh.slice(0, LINT_DETAIL_CAP);
  const more = fresh.length - shown.length;
  return {
    ok: false,
    text: `baseline: fail, ${fresh.length} new entr${fresh.length === 1 ? "y" : "ies"}\n` + shown.map((l) => l + "\n").join("") + (more ? `... ${more} more line(s)\n` : ""),
  };
}

// REQ-CLI-005 the limit strict validate applies to a requirement after archive
export const MAX_REQUIREMENT_CHARS = 500;

/** Lines inside a fenced code block, fence lines included. Same rule as OpenSpec. */
function fenceMask(lines: string[]): boolean[] {
  const mask = new Array<boolean>(lines.length).fill(false);
  let open: { ch: string; len: number } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!open) {
      const m = /^\s*(`{3,}|~{3,})/.exec(line);
      if (m) {
        open = { ch: m[1]![0]!, len: m[1]!.length };
        mask[i] = true;
      }
      continue;
    }
    mask[i] = true;
    const c = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
    if (c && c[1]![0] === open.ch && c[1]!.length >= open.len) open = null;
  }
  return mask;
}

/**
 * The requirement text as OpenSpec counts it: the trimmed, non-blank lines after the header,
 * up to the first header line, joined with a newline. Metadata lines count only when nothing else is there.
 */
export function requirementText(body: string[]): string {
  const mask = fenceMask(body);
  const text: string[] = [];
  const meta: string[] = [];
  for (let i = 0; i < body.length; i++) {
    if (mask[i]) continue;
    if (/^#{1,6}\s/.test(body[i]!)) break;
    const t = body[i]!.trim();
    if (!t) continue;
    if (/^\*\*[^*]+\*\*:/.test(t)) meta.push(t);
    else text.push(t);
  }
  return (text.length ? text : meta).join("\n");
}

/** Every requirement over the limit in openspec/changes/<active>/specs/** /spec.md. */
export function longRequirements(root: string): { id: string; chars: number; file: string }[] {
  const out: { id: string; chars: number; file: string }[] = [];
  const changes = join(root, "openspec", "changes");
  if (!existsSync(changes)) return out;
  for (const c of readdirSync(changes).sort(cmpStr)) {
    if (c === "archive" || !statSync(join(changes, c)).isDirectory()) continue;
    for (const rel of markdownFiles(join(changes, c), "specs/**/spec.md")) {
      const lines = readFileSync(join(changes, c, rel), "utf8").split(/\r?\n/);
      const mask = fenceMask(lines);
      for (let i = 0; i < lines.length; i++) {
        const h = mask[i] ? null : /^###\s+Requirement:\s*(.*)$/.exec(lines[i]!);
        if (!h) continue;
        let end = i + 1;
        while (end < lines.length && (mask[end] || !/^#{1,3}\s/.test(lines[end]!))) end++;
        const chars = requirementText(lines.slice(i + 1, end)).length; // UTF-16 units, as OpenSpec counts
        if (chars > MAX_REQUIREMENT_CHARS) out.push({ id: h[1]!.trim().split(/\s+/)[0]!, chars, file: `openspec/changes/${c}/${rel}` });
      }
    }
  }
  return out;
}

export interface RerunOpts {
  strict: boolean;
  base: string;
  json: boolean;
}

/** REQ-CLI-009 the recursion guard: a rerun that a rerun started stops at once. */
export const RERUN_GUARD = "SPECCTX_RERUN";

interface RerunLine {
  id: string;
  status: string;
  kind: "ok" | "warn" | "fail";
  file: string;
  line: number;
  evidence: string;
  expected_exit?: number | null;
  actual_exit?: number | null;
  timed_out?: boolean;
  detail?: string;
  report?: string;
}

/**
 * REQ-CLI-009 REQ-VER-005 REQ-VER-006 REQ-VER-007 `gate --rerun`. It runs the Verify command of each task that the range
 * closed, one group at a time, and compares the exit code with the evidence. It writes no evidence.
 */
export async function runRerun(root: string, cfg: import("../config.ts").Config, o: RerunOpts, io: Io): Promise<number> {
  if (process.env[RERUN_GUARD]) {
    io.out(o.json ? JSON.stringify({ ok: true, skipped: `${RERUN_GUARD} is set` }) + "\n" : `rerun: skipped, ${RERUN_GUARD} is set\n`);
    return 0;
  }
  const start = Date.now();
  const { dumps } = await import("../util/json.ts");
  const { loadIndex } = await import("../index/build.ts");
  const { scanner } = await import("../index/scan.ts");
  const { closedTasks, compare, groupRuns, judge, formatMismatch } = await import("../gate/rerun.ts");
  const { isWeakVerify, parseVerify } = await import("../verify/parse.ts");
  const { evidenceRel } = await import("../tasks/tasks.ts");
  const { runVerify } = await import("../verify/run.ts");
  const { isoNow } = await import("../util/time.ts");
  const finish = (ok: boolean): number => {
    appendGateLog(root, { at: isoNow(), ok, failed_step: ok ? null : "rerun", duration_s: Math.round((Date.now() - start) / 1000), steps: ["rerun"] });
    return ok ? 0 : 1;
  };
  const { data } = loadIndex(root, cfg);
  const closed = closedTasks(root, o.base, data.entries, scanner(root, cfg).taskRe);
  if (!closed.ok) {
    io.out(o.json ? dumps({ base: o.base, error: closed.line, merge_base: null, ok: false, tasks: [] }) + "\n" : closed.line + "\n");
    return finish(false);
  }
  const lines: RerunLine[] = [];
  const pending: { id: string; command: string; cwd: string; expected: number | null; line: RerunLine }[] = [];
  for (const e of closed.tasks) {
    const evPath = evidenceRel(e);
    let ev: import("../gate/rerun.ts").EvidenceView | null = null;
    try {
      const j = JSON.parse(readFileSync(join(root, evPath), "utf8")) as { kind: "command" | "manual"; verify?: { command?: string | null; exit?: number | null }; cwd?: string };
      ev = { kind: j.kind, command: j.verify?.command ?? null, exit: j.verify?.exit ?? null, ...(j.cwd !== undefined ? { cwd: j.cwd } : {}) };
    } catch {
      ev = null;
    }
    const tl = readFileSync(join(root, e.file), "utf8").split(/\r?\n/)[e.line - 1] ?? "";
    const spec = parseVerify(tl);
    const v = compare({ command: spec.command, ...(spec.cwd !== undefined ? { cwd: spec.cwd } : {}) }, ev, o.strict, isWeakVerify);
    const base: RerunLine = { id: e.id, status: "", kind: "ok", file: e.file, line: e.line, evidence: evPath };
    if (v.act === "warn") lines.push({ ...base, status: "warn manual", kind: "warn" });
    else if (v.act === "fail") lines.push({ ...base, status: v.kind, kind: "fail", ...(v.detail ? { detail: v.detail } : {}) });
    else {
      const l = { ...base, status: "ok" };
      lines.push(l);
      pending.push({ id: e.id, command: v.command, cwd: v.cwd, expected: v.expected, line: l });
    }
  }
  // REQ-VER-007 one run per frozen command and cwd. Groups run one at a time.
  const env = { ...process.env, CI: "1", [RERUN_GUARD]: "1" };
  for (const g of groupRuns(pending)) {
    const dir = resolve(root, g.cwd);
    let out: { exit: number | null; timedOut: boolean; output: string };
    if (dir !== resolve(root) && !dir.startsWith(resolve(root) + sep)) out = { exit: null, timedOut: false, output: `cwd ${g.cwd} is outside the project root\n` };
    else {
      const r = await runVerify(g.command, dir, cfg.verify.timeout_s, env);
      out = { exit: r.exit, timedOut: r.timedOut, output: r.output };
    }
    for (const m of g.members) {
      if (judge(m.expected, out) === "ok") continue;
      m.line.status = "mismatch";
      m.line.kind = "fail";
      m.line.expected_exit = m.expected;
      m.line.actual_exit = out.exit;
      m.line.timed_out = out.timedOut;
      m.line.report = formatMismatch({ id: m.id, file: m.line.file, line: m.line.line, evidence: m.line.evidence, expected: m.expected, outcome: out, command: g.command, cwd: g.cwd, timeoutS: cfg.verify.timeout_s });
    }
  }
  const failed = lines.filter((l) => l.kind === "fail");
  const ok = failed.length === 0;
  if (o.json) {
    io.out(dumps({
      base: o.base,
      merge_base: closed.mergeBase,
      ok,
      tasks: lines.map((l) => {
        const { report, ...rest } = l;
        void report;
        return rest;
      }),
    }) + "\n");
  } else {
    if (!lines.length) io.out("rerun: no closed tasks\n");
    for (const l of lines) {
      if (l.report) io.out(l.report);
      else io.out(`${l.id}: ${l.status}${l.detail ? ` (${l.detail})` : ""}\n`);
    }
    if (lines.length) io.out(`rerun: ${lines.length} task(s), ${failed.length} failure(s)\n`);
  }
  return finish(ok);
}
