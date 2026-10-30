// Covers: REQ-VER-008, SCN-VER-008-1, SCN-VER-008-2, SCN-VER-008-3, SCN-VER-008-4, SCN-VER-008-5, SCN-VER-008-6
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { Project } from "../helpers.ts";
import { REPO } from "../helpers.ts";
import { commitAll, git, gitProject } from "../gate/gitrepo.ts";

const SCRIPT = join(REPO, "scripts/replay-rerun.sh");
const projects: Project[] = [];
const dirs: string[] = [];
// A rerun of this suite sets SPECCTX_RERUN for its children. The script clears it for the engine, and the tests clear it for the script.
const savedGuard = process.env.SPECCTX_RERUN;
beforeEach(() => {
  delete process.env.SPECCTX_RERUN;
});
afterEach(() => {
  while (projects.length) projects.pop()!.cleanup();
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
  if (savedGuard === undefined) delete process.env.SPECCTX_RERUN;
  else process.env.SPECCTX_RERUN = savedGuard;
});

function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), "specctx-replay-"));
  dirs.push(d);
  return d;
}

type Kind = "ok" | "mismatch" | "flaky";

/** A repo with a root commit, then one commit per kind. Each commit closes one task with exit 0 evidence. */
function repoOf(kinds: Kind[]): { p: Project; counter: string } {
  const p = gitProject();
  projects.push(p);
  const counter = join(tmp(), "counter");
  p.write("README.md", "root\n");
  commitAll(p, "root");
  kinds.forEach((k, i) => {
    const key = `10${i}-x`;
    const command =
      k === "ok" ? "exit 0" : k === "mismatch" ? "exit 1" : `n=$(cat ${counter} 2>/dev/null || echo 0); echo $((n+1)) > ${counter}; [ $((n % 2)) -eq 0 ]`;
    p.write(`openspec/changes/${key}/tasks.md`, `# Tasks\n\n- [x] 1.1 Do it. [REQ-AA-001] Verify: \`${command}\`\n`);
    p.write(`.ctx/evidence/10${i}/1.1.json`, JSON.stringify({ kind: "command", task: `10${i}/1.1`, verify: { command, exit: 0 } }) + "\n");
    commitAll(p, `commit ${k}`);
  });
  return { p, counter };
}

function replay(p: Project, ...args: string[]) {
  const env = { ...process.env };
  delete env.SPECCTX_RERUN;
  const r = spawnSync("bash", [SCRIPT, p.root, ...args], { encoding: "utf8", env });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

const jsonl = (dir: string) =>
  readFileSync(join(dir, "replay.jsonl"), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

/** The count of a row in the table of summary.md. */
function count(dir: string, name: string): number {
  const m = readFileSync(join(dir, "summary.md"), "utf8").match(new RegExp(`^\\| ${name} \\| (\\d+) \\|$`, "m"));
  if (!m) throw new Error(`no row ${name}`);
  return Number(m[1]);
}

const state = (p: Project) => ({
  head: git(p, "rev-parse", "HEAD"),
  branches: git(p, "branch", "--list"),
  status: git(p, "status", "--porcelain"),
  worktrees: git(p, "worktree", "list", "--porcelain"),
});

describe("replay-rerun.sh", () => {
  test("SCN-VER-008-1 a stable task has one result per run and the root commit has no line", () => {
    const { p } = repoOf(["ok"]);
    const out = join(tmp(), "out");
    const r = replay(p, "--since", "2000-01-01", "--runs", "2", "--out", out);
    expect(r.code, r.out + r.err).toBe(0);
    const lines = jsonl(out);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ runs: 2, tasks: [{ id: "100/1.1", results: ["ok", "ok"], flaky: false }] });
    expect(lines[0].commit).toBe(git(p, "rev-parse", "--short=12", "HEAD"));
    expect(lines[0].date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(lines[0].error).toBeUndefined();
    expect(r.out).toContain(`output in ${out}`);
    expect(count(out, "commits")).toBe(1);
    expect(count(out, "tasks")).toBe(1);
    expect(count(out, "ok")).toBe(1);
    expect(count(out, "flaky")).toBe(0);
  });

  test("SCN-VER-008-2 a mismatch is data and not flaky", () => {
    const { p } = repoOf(["ok", "mismatch"]);
    const out = join(tmp(), "out");
    const r = replay(p, "--since", "2000-01-01", "--out", out);
    expect(r.code, r.out + r.err).toBe(0);
    const lines = jsonl(out);
    expect(lines).toHaveLength(2);
    expect(lines[1].runs).toBe(3);
    expect(lines[1].tasks).toEqual([{ id: "101/1.1", results: ["mismatch", "mismatch", "mismatch"], flaky: false }]);
    expect(count(out, "commits")).toBe(2);
    expect(count(out, "ok")).toBe(1);
    expect(count(out, "mismatch")).toBe(1);
    expect(count(out, "flaky")).toBe(0);
    expect(count(out, "errors")).toBe(0);
  });

  test("SCN-VER-008-3 a task that alternates is flaky and the exit code is 1", () => {
    const { p, counter } = repoOf(["ok", "mismatch", "flaky"]);
    const out = join(tmp(), "out");
    const r = replay(p, "--since", "2000-01-01", "--out", out);
    expect(r.code, r.out + r.err).toBe(1);
    const lines = jsonl(out);
    expect(lines).toHaveLength(3);
    expect(lines[2].tasks).toEqual([{ id: "102/1.1", results: ["ok", "mismatch", "ok"], flaky: true }]);
    expect(count(out, "commits")).toBe(3);
    expect(count(out, "tasks")).toBe(3);
    expect(count(out, "ok")).toBe(1);
    expect(count(out, "mismatch")).toBe(1);
    expect(count(out, "flaky")).toBe(1);
    expect(count(out, "no-evidence")).toBe(0);
    expect(count(out, "verify-drift")).toBe(0);
    expect(readFileSync(counter, "utf8").trim()).toBe("3");
  });

  test("SCN-VER-008-4 a failed setup is an error and not flaky", () => {
    const { p } = repoOf(["ok", "mismatch"]);
    const out = join(tmp(), "out");
    const r = replay(p, "--since", "2000-01-01", "--setup", "echo broken >&2; exit 3", "--out", out);
    expect(r.code, r.out + r.err).toBe(0);
    const lines = jsonl(out);
    expect(lines).toHaveLength(2);
    for (const l of lines) {
      expect(l.error).toContain("setup failed");
      expect(l.tasks).toEqual([]);
    }
    expect(count(out, "commits")).toBe(2);
    expect(count(out, "errors")).toBe(2);
    expect(count(out, "flaky")).toBe(0);
    expect(count(out, "tasks")).toBe(0);
  });

  test("SCN-VER-008-4 a good setup runs in the worktree and the run continues", () => {
    const { p } = repoOf(["ok"]);
    const out = join(tmp(), "out");
    const r = replay(p, "--since", "2000-01-01", "--runs", "1", "--setup", "test -f README.md", "--out", out);
    expect(r.code, r.out + r.err).toBe(0);
    expect(jsonl(out)[0].error).toBeUndefined();
    expect(count(out, "ok")).toBe(1);
  });

  test("SCN-VER-008-5 the source repo is unchanged and no worktree is left", () => {
    const { p } = repoOf(["ok", "mismatch", "flaky"]);
    const before = state(p);
    const snap = p.snapshot();
    for (const args of [[], ["--setup", "exit 1"]]) {
      const r = replay(p, "--since", "2000-01-01", "--runs", "2", "--out", join(tmp(), "out"), ...args);
      expect([0, 1]).toContain(r.code);
      expect(state(p)).toEqual(before);
      expect(git(p, "worktree", "list").split("\n")).toHaveLength(1);
      expect(p.snapshot()).toEqual(snap);
    }
  });

  test("SCN-VER-008-5 the default out dir is printed", () => {
    const { p } = repoOf(["ok"]);
    const r = replay(p, "--since", "2000-01-01", "--runs", "1");
    expect(r.code, r.out + r.err).toBe(0);
    const m = r.out.match(/output in (\S+)/);
    expect(m).not.toBeNull();
    const dir = m![1]!;
    dirs.push(dir);
    expect(existsSync(join(dir, "summary.md"))).toBe(true);
  });

  test("SCN-VER-008-6 a usage error exits 2 and creates no output", () => {
    const { p } = repoOf(["ok"]);
    const notRepo = tmp();
    const out = join(tmp(), "out");
    const cases: string[][] = [
      ["--out", out],
      ["--since", "2000-01-01", "--runs", "0", "--out", out],
      ["--since", "2000-01-01", "--runs", "x", "--out", out],
      ["--since", "2000-01-01", "--bogus", "--out", out],
    ];
    for (const a of cases) {
      const r = replay(p, ...a);
      expect(r.code, a.join(" ")).toBe(2);
      expect(r.err).toContain("usage:");
    }
    const env = { ...process.env };
    delete env.SPECCTX_RERUN;
    const r = spawnSync("bash", [SCRIPT, notRepo, "--since", "2000-01-01", "--out", out], { encoding: "utf8", env });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("usage:");
    expect(existsSync(out)).toBe(false);
  });
});
