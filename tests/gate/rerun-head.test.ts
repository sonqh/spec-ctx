// Covers: REQ-VER-010, SCN-VER-010-1, SCN-VER-010-2
import { existsSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { Project } from "../helpers.ts";
import { commitAll, git, gitProject } from "./gitrepo.ts";

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

const TASKS = "openspec/changes/041-x/tasks.md";
const LINE = "rerun: merge base is HEAD, nothing to compare. On push, pass --base <the commit before the push>\n";

/** Two commits on main. The second closes task 1.1, and its Verify leaves a marker file when it runs. */
function setup(): Project {
  const p = gitProject();
  projects.push(p);
  const line = (box: string): string => `- [${box}] 1.1 Do it. [REQ-AA-001] Verify: \`echo ran >> ran.log\`\n`;
  p.write(TASKS, "# Tasks\n\n" + line(" "));
  commitAll(p, "base");
  p.write(TASKS, "# Tasks\n\n" + line("x"));
  p.write(".ctx/evidence/041/1.1.json", JSON.stringify({ kind: "command", task: "041/1.1", verify: { command: "echo ran >> ran.log", exit: 0 } }) + "\n");
  commitAll(p, "close");
  return p;
}

describe("the rerun with the merge base at HEAD", () => {
  test("SCN-VER-010-1 the default base on the same commit prints one line, runs nothing, exits 0", async () => {
    const p = setup();
    const r = await p.run("gate", "--rerun", "--base", "main");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toBe(LINE);
    expect(existsSync(p.path("ran.log"))).toBe(false);
    const j = await p.run("gate", "--rerun", "--base", "main", "--json");
    expect(j.code).toBe(0);
    expect(JSON.parse(j.out)).toMatchObject({ ok: true, tasks: [], warning: LINE.trim() });
  });

  test("SCN-VER-010-2 an older base checks the closed tasks", async () => {
    const p = setup();
    const r = await p.run("gate", "--rerun", "--base", git(p, "rev-parse", "HEAD~1"));
    expect(r.code, r.out + r.err).toBe(0);
    expect(r.out).not.toContain("merge base is HEAD");
    expect(r.out).toContain("041/1.1: ok");
    expect(existsSync(p.path("ran.log"))).toBe(true);
  });
});
