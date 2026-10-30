// Covers: REQ-VER-011, SCN-VER-011-1
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

describe("the rerun reads non-ASCII paths", () => {
  test("SCN-VER-011-1 a change folder with a non-ASCII name still counts as closed", async () => {
    const p = gitProject();
    projects.push(p);
    // quoted paths would hide this folder from the merge base, so an already done task would count as closed
    const tasks = "openspec/changes/042-café/tasks.md";
    const line = (box: string): string => `- [${box}] 1.1 Do it. [REQ-AA-001] Verify: \`exit 0\`\n`;
    p.write(tasks, "# Tasks\n\n" + line("x"));
    p.write(".ctx/evidence/042/1.1.json", JSON.stringify({ kind: "command", task: "042/1.1", verify: { command: "exit 0", exit: 0 } }) + "\n");
    commitAll(p, "base");
    git(p, "checkout", "-q", "-b", "feature");
    p.write("other.txt", "x\n");
    commitAll(p, "other");
    const r = await p.run("gate", "--rerun", "--base", "main");
    // the task is done at the merge base, so it is not closed in the range
    expect(r.code, r.out + r.err).toBe(0);
    expect(r.out).not.toContain("042/1.1");
    // a second task that closes in the range counts
    p.write(tasks, "# Tasks\n\n" + line("x") + "- [x] 1.2 More. [REQ-AA-001] Verify: `exit 0`\n");
    p.write(".ctx/evidence/042/1.2.json", JSON.stringify({ kind: "command", task: "042/1.2", verify: { command: "exit 0", exit: 0 } }) + "\n");
    commitAll(p, "close");
    const s = await p.run("gate", "--rerun", "--base", "main");
    expect(s.code, s.out + s.err).toBe(0);
    expect(s.out).toContain("042/1.2: ok");
    expect(s.out).not.toContain("042/1.1");
  });
});
