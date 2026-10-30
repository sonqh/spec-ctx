// Covers: REQ-VER-013, SCN-VER-013-1, SCN-VER-013-2
import { existsSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { Project } from "../helpers.ts";
import { commitAll, gitProject } from "./gitrepo.ts";

const projects: Project[] = [];
const savedGuard = process.env.SPECCTX_RERUN;
beforeEach(() => {
  delete process.env.SPECCTX_RERUN;
});
afterEach(() => {
  while (projects.length) projects.pop()!.cleanup();
  if (savedGuard === undefined) delete process.env.SPECCTX_RERUN;
  else process.env.SPECCTX_RERUN = savedGuard;
});

const TASKS = "openspec/changes/042-x/tasks.md";
const ZERO = "0".repeat(40);
const ZERO_LINE = "rerun: base is the zero commit (a new branch), nothing to compare\n";

/** One commit that closes task 1.1. Its Verify leaves a marker file when it runs. */
function setup(): Project {
  const p = gitProject();
  projects.push(p);
  p.write(TASKS, "# Tasks\n\n- [x] 1.1 Do it. [REQ-AA-001] Verify: `echo ran >> ran.log`\n");
  p.write(".ctx/evidence/042/1.1.json", JSON.stringify({ kind: "command", task: "042/1.1", verify: { command: "echo ran >> ran.log", exit: 0 } }) + "\n");
  commitAll(p, "close");
  return p;
}

describe("the rerun checks its base first", () => {
  test("SCN-VER-013-1 a base of forty zeros prints one line, runs nothing, exits 0", async () => {
    const p = setup();
    const r = await p.run("gate", "--rerun", "--base", ZERO);
    expect(r.code, r.err).toBe(0);
    expect(r.out).toBe(ZERO_LINE);
    expect(existsSync(p.path("ran.log"))).toBe(false);
    const j = await p.run("gate", "--rerun", "--base", ZERO, "--json");
    expect(j.code).toBe(0);
    expect(JSON.parse(j.out)).toMatchObject({ ok: true, tasks: [], warning: ZERO_LINE.trim() });
  });

  test("SCN-VER-013-2 a base that the clone lacks prints the fetch line and exits 1", async () => {
    const p = setup();
    const ref = "1".repeat(40);
    const r = await p.run("gate", "--rerun", "--base", ref);
    expect(r.code).toBe(1);
    expect(r.out).toBe(`rerun: base ${ref} is not in this clone. Fetch it or use fetch-depth: 0\n`);
    expect(existsSync(p.path("ran.log"))).toBe(false);
    const named = await p.run("gate", "--rerun", "--base", "origin/nope");
    expect(named.code).toBe(1);
    expect(named.out).toBe("rerun: base origin/nope is not in this clone. Fetch it or use fetch-depth: 0\n");
  });

  test("SCN-VER-013-2 a base that resolves goes on to the merge base check", async () => {
    const p = setup();
    const r = await p.run("gate", "--rerun", "--base", "main");
    expect(r.out).not.toContain("is not in this clone");
    expect(r.out).not.toContain("zero commit");
  });
});
