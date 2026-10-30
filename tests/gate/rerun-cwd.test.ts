// Covers: REQ-VER-009, SCN-VER-009-1, SCN-VER-009-2
import { readFileSync } from "node:fs";
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

/** One closed task whose Verify runs in the cwd `dir`. The evidence records exit 0. */
function setup(dir: string, file = false): Project {
  const p = gitProject();
  projects.push(p);
  const line = (box: string): string => `- [${box}] 1.1 Do it. [REQ-AA-001] Verify: \`cwd=${dir} exit 0\`\n`;
  p.write(TASKS, "# Tasks\n\n" + line(" "));
  if (file) p.write(dir, "not a directory\n");
  commitAll(p, "base");
  git(p, "checkout", "-q", "-b", "feature");
  p.write(TASKS, "# Tasks\n\n" + line("x"));
  p.write(".ctx/evidence/041/1.1.json", JSON.stringify({ kind: "command", task: "041/1.1", verify: { command: "exit 0", exit: 0 }, cwd: dir }) + "\n");
  commitAll(p, "close");
  return p;
}

describe("the rerun survives a bad cwd", () => {
  test("SCN-VER-009-1 a missing cwd is a mismatch with the reason, and the log line is written", async () => {
    const p = setup("nowhere");
    const r = await p.run("gate", "--rerun", "--base", "main");
    expect(r.code, r.err).toBe(1);
    expect(r.out).toContain("041/1.1: mismatch");
    expect(r.out).toContain("cwd does not exist: nowhere");
    expect(r.out).toContain("rerun: 1 task(s), 1 failure(s)");
    const log = readFileSync(p.path(".ctx/gate-log.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(log.at(-1)).toMatchObject({ ok: false, failed_step: "rerun", steps: ["rerun"] });
    const j = await p.run("gate", "--rerun", "--base", "main", "--json");
    expect(JSON.parse(j.out).tasks[0]).toMatchObject({ id: "041/1.1", status: "mismatch", detail: "cwd does not exist: nowhere" });
  });

  test("SCN-VER-009-2 a spawn error is a mismatch of the group, with a report and a log line", async () => {
    const p = setup("afile", true);
    const r = await p.run("gate", "--rerun", "--base", "main");
    expect(r.err).toBe("");
    expect(r.code).toBe(1);
    expect(r.out).toContain("041/1.1: mismatch");
    expect(r.out).toContain("spawn failed");
    expect(readFileSync(p.path(".ctx/gate-log.jsonl"), "utf8").trim().split("\n")).toHaveLength(1);
  });
});
