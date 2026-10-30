// Covers: REQ-CLI-009, REQ-VER-007, REQ-VER-006, REQ-CLI-004, REQ-STAT-005
import { existsSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { Project } from "../helpers.ts";
import { commitAll, git, gitProject } from "./gitrepo.ts";

const projects: Project[] = [];
// A rerun of this suite sets SPECCTX_RERUN for its children. The tests clear it, so the guard test sets it alone.
const savedGuard = process.env.SPECCTX_RERUN;
beforeEach(() => {
  delete process.env.SPECCTX_RERUN;
});
afterEach(() => {
  while (projects.length) projects.pop()!.cleanup();
  if (savedGuard === undefined) delete process.env.SPECCTX_RERUN;
  else process.env.SPECCTX_RERUN = savedGuard;
  delete process.env.SPECCTX_OPENSPEC;
});

interface Task {
  num: string;
  command: string;
  cwd?: string;
  /** the exit code that the evidence records */
  exit?: number;
  evidence?: "command" | "manual" | "none";
}

const TASKS = "openspec/changes/036-x/tasks.md";

function taskLine(t: Task, box: string): string {
  const span = t.cwd ? `cwd=${t.cwd} ${t.command}` : t.command;
  return `- [${box}] ${t.num} Do ${t.num}. [REQ-AA-001] Verify: \`${span}\`\n`;
}

/** A repo with the tasks open on main and done on a feature branch, plus handwritten evidence. */
function setup(tasks: Task[], toml = ""): Project {
  const p = gitProject();
  projects.push(p);
  if (toml) p.write("spec-ctx.toml", toml);
  p.write(TASKS, "# Tasks\n\n" + tasks.map((t) => taskLine(t, " ")).join(""));
  commitAll(p, "base");
  git(p, "checkout", "-q", "-b", "feature");
  p.write(TASKS, "# Tasks\n\n" + tasks.map((t) => taskLine(t, "x")).join(""));
  for (const t of tasks) {
    const kind = t.evidence ?? "command";
    if (kind === "none") continue;
    const ev = kind === "manual"
      ? { kind, task: `036/${t.num}`, verify: { command: null, exit: null } }
      : { kind, task: `036/${t.num}`, verify: { command: t.command, exit: t.exit ?? 0 }, ...(t.cwd ? { cwd: t.cwd } : {}) };
    p.write(`.ctx/evidence/036/${t.num}.json`, JSON.stringify(ev) + "\n");
  }
  commitAll(p, "close");
  return p;
}

const rerun = (p: Project, ...a: string[]) => p.run("gate", "--rerun", "--base", "main", ...a);
const lines = (s: string) => s.split("\n").filter(Boolean);

describe("gate --rerun", () => {
  test("SCN-CLI-009-2 runs only the rerun step and logs it", async () => {
    const p = setup([{ num: "1.1", command: "exit 0" }]);
    const r = await rerun(p);
    expect(r.code, r.out + r.err).toBe(0);
    expect(lines(r.out)).toEqual(["036/1.1: ok", "rerun: 1 task(s), 0 failure(s)"]);
    const log = lines(readFileSync(p.path(".ctx/gate-log.jsonl"), "utf8")).map((l) => JSON.parse(l));
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ ok: true, failed_step: null, steps: ["rerun"] });
    expect(typeof log[0].strict).toBe("boolean");
  });

  test("SCN-CLI-009-1 the default gate does not run the rerun", async () => {
    const p = setup([{ num: "1.1", command: "exit 0" }]);
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    const r = await p.run("gate");
    expect(r.out).not.toContain("rerun");
    const log = lines(readFileSync(p.path(".ctx/gate-log.jsonl"), "utf8")).map((l) => JSON.parse(l));
    expect(log.every((l) => !l.steps.includes("rerun"))).toBe(true);
  });

  test("SCN-CLI-009-3 the guard prints one line, runs nothing, and exits 0", async () => {
    const p = setup([{ num: "1.1", command: "echo ran >> guard.log" }]);
    process.env.SPECCTX_RERUN = "1";
    const r = await rerun(p);
    expect(r.code).toBe(0);
    expect(lines(r.out)).toEqual(["rerun: skipped, SPECCTX_RERUN is set"]);
    expect(existsSync(p.path("guard.log"))).toBe(false);
  });

  test("SCN-CLI-009-4 json has base, merge_base, ok, and tasks", async () => {
    const p = setup([{ num: "1.1", command: "exit 0" }, { num: "1.2", command: "exit 0", evidence: "manual" }]);
    const r = await rerun(p, "--json");
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out);
    expect(Object.keys(j)).toEqual(["base", "merge_base", "ok", "tasks"]);
    expect(j.base).toBe("main");
    expect(j.merge_base).toMatch(/^[0-9a-f]{40}$/);
    expect(j.ok).toBe(true);
    expect(j.tasks.map((t: any) => [t.id, t.status, t.kind])).toEqual([["036/1.1", "ok", "ok"], ["036/1.2", "warn manual", "warn"]]);
  });

  test("SCN-CLI-009-5 writes no evidence, and a usage error exits 2", async () => {
    const p = setup([{ num: "1.1", command: "exit 0" }]);
    const before = [...p.snapshot()].filter(([k]) => k.startsWith(".ctx/evidence/"));
    const r = await rerun(p);
    expect(r.code).toBe(0);
    expect([...p.snapshot()].filter(([k]) => k.startsWith(".ctx/evidence/"))).toEqual(before);
    expect((await p.run("gate", "--rerun", "extra")).code).toBe(2);
    expect((await p.run("gate", "--base", "main")).code).toBe(2);
  });

  test("SCN-VER-006-1 manual evidence warns, and fails under strict", async () => {
    const p = setup([{ num: "1.1", command: "exit 0", evidence: "manual" }]);
    const a = await rerun(p);
    expect(a.code).toBe(0);
    expect(a.out).toContain("036/1.1: warn manual\n");
    const b = await rerun(p, "--strict");
    expect(b.code).toBe(1);
    expect(b.out).toContain("036/1.1: manual\n");
  });

  test("SCN-VER-006-2 missing evidence fails", async () => {
    const p = setup([{ num: "1.1", command: "exit 0", evidence: "none" }]);
    const r = await rerun(p);
    expect(r.code).toBe(1);
    expect(r.out).toContain("036/1.1: no-evidence\n");
  });

  test("SCN-VER-006-3 drift fails and runs nothing", async () => {
    const p = setup([{ num: "1.1", command: "echo ran >> drift.log" }]);
    p.write(`.ctx/evidence/036/1.1.json`, JSON.stringify({ kind: "command", verify: { command: "echo other", exit: 0 } }) + "\n");
    const r = await rerun(p);
    expect(r.code).toBe(1);
    expect(r.out).toContain("036/1.1: verify-drift");
    expect(existsSync(p.path("drift.log"))).toBe(false);
  });

  test("SCN-VER-006-4 a weak Verify fails under strict and does not run", async () => {
    const p = setup([{ num: "1.1", command: "true" }]);
    expect((await rerun(p)).code).toBe(0);
    const r = await rerun(p, "--strict");
    expect(r.code).toBe(1);
    expect(r.out).toContain("036/1.1: weak-verify\n");
  });

  test("SCN-VER-006-5 and SCN-VER-007-3 a different exit code prints the report", async () => {
    const p = setup([{ num: "1.1", command: "echo boom; exit 3", exit: 0 }]);
    const r = await rerun(p);
    expect(r.code).toBe(1);
    expect(r.out).toContain("036/1.1: mismatch\n");
    expect(r.out).toContain(`  at ${TASKS}:3\n`);
    expect(r.out).toContain("  evidence .ctx/evidence/036/1.1.json\n");
    expect(r.out).toContain("  expected exit 0\n  actual exit 3\n");
    expect(r.out).toContain("    boom\n");
    expect(r.out).toContain("  reproduce: cd '.' && env CI=1 SPECCTX_RERUN=1 sh -c 'echo boom; exit 3'\n");
    const log = JSON.parse(lines(readFileSync(p.path(".ctx/gate-log.jsonl"), "utf8")).pop()!);
    expect(log).toMatchObject({ ok: false, failed_step: "rerun", steps: ["rerun"] });
  });

  test("a failing exit code in the evidence matches a failing run", async () => {
    const p = setup([{ num: "1.1", command: "exit 3", exit: 3 }]);
    expect((await rerun(p)).code).toBe(0);
  });

  test("SCN-VER-006-5 a timeout is a mismatch", async () => {
    const p = setup([{ num: "1.1", command: "sleep 5" }], "[verify]\ntimeout_s = 1\n");
    const r = await rerun(p);
    expect(r.code).toBe(1);
    expect(r.out).toContain("  actual timed out after 1s\n");
  });

  test("SCN-VER-006-6 the same exit code with other output is ok", async () => {
    const p = setup([{ num: "1.1", command: "date +%N" }]);
    expect((await rerun(p)).code).toBe(0);
  });

  test("SCN-VER-007-1 equal command and cwd run once and share the result", async () => {
    const p = setup([
      { num: "1.1", command: "echo run >> dedupe.log; exit 3", exit: 0 },
      { num: "1.2", command: "echo run >> dedupe.log; exit 3", exit: 0 },
      { num: "1.3", command: "echo run >> dedupe.log; exit 3", exit: 3 },
    ]);
    const r = await rerun(p);
    expect(readFileSync(p.path("dedupe.log"), "utf8")).toBe("run\n");
    expect(r.out).toContain("036/1.1: mismatch\n");
    expect(r.out).toContain("036/1.2: mismatch\n");
    expect(r.out).toContain("036/1.3: ok\n");
  });

  test("SCN-VER-007-2 groups run in ID order with CI and SPECCTX_RERUN set", async () => {
    const p = setup([
      { num: "2.1", command: 'echo "two $CI $SPECCTX_RERUN" >> order.log' },
      { num: "1.1", command: 'echo "one $CI $SPECCTX_RERUN" >> order.log' },
    ]);
    const r = await rerun(p);
    expect(r.code, r.out).toBe(0);
    expect(readFileSync(p.path("order.log"), "utf8")).toBe("one 1 1\ntwo 1 1\n");
    expect(process.env.SPECCTX_RERUN).toBeUndefined();
  });

  test("a cwd prefix runs in the evidence cwd", async () => {
    const p = setup([{ num: "1.1", command: "pwd > where.log", cwd: "sub" }]);
    p.write("sub/keep", "");
    const r = await rerun(p);
    expect(r.code, r.out).toBe(0);
    expect(readFileSync(p.path("sub/where.log"), "utf8").trim().endsWith("/sub")).toBe(true);
  });

  test("SCN-VER-005-3 no merge base fails with the one line", async () => {
    const p = setup([{ num: "1.1", command: "exit 0" }]);
    // a commit with no shared history: the ref exists (042/D3), the merge base does not
    git(p, "checkout", "-q", "--orphan", "other");
    git(p, "commit", "-q", "--allow-empty", "-m", "unrelated");
    git(p, "checkout", "-q", "main");
    const r = await p.run("gate", "--rerun", "--base", "other");
    expect(r.code).toBe(1);
    expect(lines(r.out)).toEqual(["rerun: no merge base with other, fetch full history (fetch-depth: 0)"]);
  });

  test("no closed task prints one line and exits 0", async () => {
    const p = setup([{ num: "1.1", command: "exit 0" }]);
    // an empty commit on top, so the merge base is HEAD~1 and not HEAD (041/D4)
    git(p, "commit", "-q", "--allow-empty", "-m", "empty");
    const r = await p.run("gate", "--rerun", "--base", "HEAD~1");
    expect(r.code).toBe(0);
    expect(lines(r.out)).toEqual(["rerun: no closed tasks"]);
  });
});
