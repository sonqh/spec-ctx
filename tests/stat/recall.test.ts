// Covers: REQ-STAT-006
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { BASE_FIXTURE, cleanEnv, REPO } from "../helpers.ts";

const SCRIPT = join(REPO, "scripts/recall.mjs");
const TEST_MS = 60_000;
const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function temp(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(d);
  return d;
}

function git(root: string, ...args: string[]): string {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args], { cwd: root, env: cleanEnv(), encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}

function put(root: string, rel: string, text: string): void {
  mkdirSync(join(root, rel, ".."), { recursive: true });
  writeFileSync(join(root, rel), text);
}

/**
 * The project of the cases. Change 001 and change 003 are archived and edit code. Change 002 is archived and edits only docs.
 * Candidates: 001/1.1, 001/1.2, 003/1.1, 003/1.2, 003/1.3.
 */
function project(): string {
  const root = temp("specctx-recall-");
  cpSync(BASE_FIXTURE, root, { recursive: true });
  rmSync(join(root, ".ctx"), { recursive: true, force: true });
  const arch = join(root, "openspec/changes/archive");
  mkdirSync(arch, { recursive: true });
  renameSync(join(root, "openspec/changes/001-x"), join(arch, "2026-01-01-001-x"));
  const tasks = join(arch, "2026-01-01-001-x/tasks.md");
  writeFileSync(tasks, readFileSync(tasks, "utf8").replace("- [ ] 1.2", "- [x] 1.2"));
  put(root, "src/b.ts", "export const b = 2;\n");
  put(root, "tests/b.test.ts", "export {};\n");
  git(root, "init", "-q");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "001");
  put(root, "openspec/changes/archive/2026-01-02-002-docs/tasks.md", "# Tasks\n\n## 1. Docs\n\n- [x] 1.1 Write the notes. [REQ-AAA-001] Verify: `true`\n");
  put(root, "docs/notes.md", "# Notes\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "002");
  put(
    root,
    "openspec/changes/archive/2026-01-03-003-y/tasks.md",
    "# Tasks\n\n## 1. C\n\n- [x] 1.1 Add c. [REQ-AAA-001] Verify: `true`\n- [x] 1.2 Test c. [REQ-AAA-001] Verify: `true`\n- [x] 1.3 Doc c. [REQ-AAA-001] Verify: `true`\n",
  );
  put(root, "src/c.ts", "export const c = 3;\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "003");
  return root;
}

function run(...args: string[]): { code: number; out: string; err: string } {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: REPO, env: cleanEnv(), encoding: "utf8", timeout: TEST_MS });
  return { code: r.status ?? -1, out: r.stdout ?? "", err: r.stderr ?? "" };
}

function sample(root: string, n: number, seed: number, changes?: string): string[] {
  const r = run("--root", root, "--sample", String(n), "--seed", String(seed), ...(changes ? ["--changes", changes] : []));
  expect(r.code, r.err).toBe(0);
  return r.out.split("\n").filter(Boolean);
}

interface Label {
  task: string;
  reqs: string[];
  code: string[];
  tests: string[];
  note: string;
}

function labels(root: string, tasks: Label[], extra: Record<string, unknown> = {}, name = "labels.json"): string {
  const file = join(root, name);
  writeFileSync(file, JSON.stringify({ repo: "toy", budget: 8000, seed: 1, sample: tasks.length, changes: ["001"], tasks, ...extra }, null, 2));
  return file;
}

const T11: Label = { task: "001/1.1", reqs: ["REQ-AAA-001"], code: ["src/a.ts"], tests: ["tests/a.cases.ts"], note: "every label prints" };
const T12: Label = { task: "001/1.2", reqs: ["REQ-AAA-002"], code: ["src/b.ts"], tests: ["tests/b.test.ts"], note: "b.ts and b.test.ts carry no tag" };

function report(out: string): any {
  const files = readdirSync(out).filter((f) => f.endsWith(".json"));
  expect(files).toHaveLength(1);
  return JSON.parse(readFileSync(join(out, files[0]!), "utf8"));
}

describe("scripts/recall.mjs", () => {
  test("SCN-STAT-006-1 recall, recall by kind, and misses of a known project", () => {
    const root = project();
    const out = temp("specctx-recall-out-");
    const r = run("--labels", labels(root, [T11, T12]), "--root", root, "--out", out, "--date", "2026-01-04", "--runs", "1");
    expect(r.code, r.err).toBe(0);
    expect(existsSync(join(out, "recall-2026-01-04.md"))).toBe(true);
    const repo = report(out).repos[0];
    expect(repo.labels).toEqual({ total: 6, reqs: 2, code: 2, tests: 2 });
    expect(repo.matched).toEqual({ total: 4, reqs: 2, code: 1, tests: 1 });
    expect(repo.recall).toBeCloseTo(4 / 6, 4);
    expect(repo.recall_by_kind).toEqual({ reqs: 1, code: 0.5, tests: 0.5 });
    expect(repo.complete).toBe(1);
    const misses = Object.fromEntries(repo.per_task.map((t: any) => [t.task, t.misses]));
    expect(misses).toEqual({ "001/1.1": [], "001/1.2": ["src/b.ts", "tests/b.test.ts"] });
    expect(typeof repo.p95_ms).toBe("number");
    expect(repo.labels_sha256).toMatch(/^[0-9a-f]{64}$/);
  }, TEST_MS);

  test("SCN-STAT-006-2 entries cut by the budget are misses, a printed entry still matches", () => {
    const root = project();
    const out = temp("specctx-recall-out-");
    const t11 = { ...T11, reqs: ["REQ-AAA-001", "REQ-BBB-001"], code: [], tests: ["tests/a.cases.ts"] };
    const t12 = { ...T12, code: [], tests: [] };
    const r = run("--labels", labels(root, [t11, t12], { budget: 500 }), "--root", root, "--out", out, "--date", "2026-01-04", "--runs", "1");
    expect(r.code, r.err).toBe(0);
    const t = report(out).repos[0].per_task.find((x: any) => x.task === "001/1.1");
    expect(t.misses).toEqual(["REQ-BBB-001", "tests/a.cases.ts"]);
    expect(t.matched).toBe(1);
  }, TEST_MS);

  test("SCN-STAT-006-3 bad input exits 2, names the cause, and writes no report", () => {
    const root = project();
    const out = temp("specctx-recall-out-");
    const head = git(root, "rev-parse", "HEAD");
    const other = sample(root, 2, 3, "001,003").sort();
    const pick = other.join(",") === "001/1.1,001/1.2" ? 4 : 3;
    const cases: [string, string, string][] = [
      ["unknown task", labels(root, [T11, { ...T12, task: "001/9.9" }], {}, "bad-0.json"), "001/9.9"],
      ["missing field", labels(root, [T11, { ...T12, tests: undefined } as unknown as Label], {}, "bad-1.json"), "tests"],
      ["missing path", labels(root, [T11, { ...T12, code: ["src/zz.ts"] }], {}, "bad-2.json"), "src/zz.ts"],
      ["other commit", labels(root, [T11, T12], { commit: "0".repeat(40) }, "bad-3.json"), head],
      ["not the sample", labels(root, [T11, T12], { changes: ["001", "003"], seed: pick }, "bad-4.json"), "sample"],
    ];
    for (const [name, file, cause] of cases) {
      const r = run("--labels", file, "--root", root, "--out", out, "--date", "2026-01-04", "--runs", "1");
      expect(r.code, `${name}: ${r.err}`).toBe(2);
      expect(r.err, name).toContain(cause);
      expect(readdirSync(out), name).toEqual([]);
    }
  }, TEST_MS);

  test("SCN-STAT-006-4 two runs on one commit give the same recall, misses, and sha256", () => {
    const root = project();
    const file = labels(root, [T11, T12]);
    const a = temp("specctx-recall-a-");
    const b = temp("specctx-recall-b-");
    for (const out of [a, b]) expect(run("--labels", file, "--root", root, "--out", out, "--date", "2026-01-04", "--runs", "1").code).toBe(0);
    const pick = (j: any) => j.repos.map((r: any) => ({ recall: r.recall, sha: r.labels_sha256, misses: r.per_task.map((t: any) => [t.task, t.misses]) }));
    expect(pick(report(a))).toEqual(pick(report(b)));
  }, TEST_MS);

  test("SCN-STAT-006-5 the seeded sample repeats for one seed and changes with others", () => {
    const root = project();
    const once = sample(root, 3, 7);
    expect(once).toHaveLength(3);
    expect(sample(root, 3, 7)).toEqual(once);
    for (const t of once) expect(["001/1.1", "001/1.2", "003/1.1", "003/1.2", "003/1.3"]).toContain(t);
    const picks = new Set([1, 2, 3, 4, 5, 6, 8, 9].map((s) => sample(root, 3, s).join(",")));
    expect(picks.size).toBeGreaterThan(1);
  }, TEST_MS);

  test("SCN-STAT-006-5 candidates open picks the open tasks of active changes with no commit filter", () => {
    const root = project();
    // An active change with two open tasks and one done task. It has no commit, so the git log holds nothing for it.
    put(root, "openspec/changes/004-z/tasks.md", "# Tasks\n\n## 1. Z\n\n- [ ] 1.1 Add z. [REQ-AAA-001] Verify: `true`\n- [x] 1.2 Done z. [REQ-AAA-001] Verify: `true`\n- [ ] 1.3 Doc z. [REQ-AAA-002] Verify: `true`\n");
    const r = run("--root", root, "--sample", "5", "--seed", "7", "--candidates", "open");
    expect(r.code, r.err).toBe(0);
    expect(r.out.split("\n").filter(Boolean)).toEqual(["004/1.1", "004/1.3"]);
    const open: Label[] = [
      { task: "004/1.1", reqs: ["REQ-AAA-001"], code: [], tests: [], note: "the task text names it" },
      { task: "004/1.3", reqs: ["REQ-AAA-002"], code: [], tests: [], note: "the task text names it" },
    ];
    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim();
    const noCommit = run("--labels", labels(root, open, { changes: undefined, candidates: "open", seed: 7 }, "open-nocommit.json"), "--check-schema");
    expect(noCommit.code).toBe(2);
    expect(noCommit.err).toContain("candidates open needs the field commit");
    const ok = run("--labels", labels(root, open, { changes: undefined, candidates: "open", seed: 7, commit: head }, "open.json"), "--root", root, "--check");
    expect(ok.code, ok.err).toBe(0);
    expect(ok.out).toContain("check ok: open.json");
    const archived = run("--labels", labels(root, [T11, T12], { changes: undefined, candidates: "open", commit: head }, "open-bad.json"), "--root", root, "--check");
    expect(archived.code).toBe(2);
    expect(archived.err).toContain("004/1.1, 004/1.3");
    const bad = run("--root", root, "--sample", "2", "--seed", "7", "--candidates", "all");
    expect(bad.code).toBe(2);
    expect(bad.err).toContain("archived or open");
  }, TEST_MS);

  test("SCN-STAT-006-5 a shallow clone fails the archived sample", () => {
    const root = project();
    const shallow = join(root, "..", "shallow-" + Date.now());
    const c = spawnSync("git", ["clone", "--quiet", "--depth", "1", "file://" + root, shallow], { encoding: "utf8" });
    expect(c.status, c.stderr).toBe(0);
    const r = run("--root", shallow, "--sample", "2", "--seed", "7");
    expect(r.code).toBe(2);
    expect(r.err).toContain("shallow clone");
  }, TEST_MS);

  test("SCN-STAT-006-1 recall.sh prints its usage and runs no clone with --help", () => {
    const r = spawnSync("bash", [join(REPO, "scripts/recall.sh"), "--help"], { cwd: REPO, env: cleanEnv(), encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("usage: recall.sh [--out <dir>] [--date <yyyy-mm-dd>] [--runs <n>]");
  });
});
