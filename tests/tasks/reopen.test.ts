// Covers: REQ-TASK-005
import { afterEach, describe, expect, test } from "vitest";
import { existsSync } from "node:fs";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const TASKS = "openspec/changes/005-ux/tasks.md";

describe("task reopen", () => {
  test("SCN-TASK-005-1 reopen keeps the old evidence and lists the reason in the handoff", async () => {
    p = new Project();
    p.write(TASKS, "# Tasks\n\n- [ ] 1.1 Do. [REQ-AAA-002] Verify: `true`\n");
    expect((await p.run("task", "done", "005/1.1")).code).toBe(0);
    const r = await p.run("task", "reopen", "005/1.1", "REQ-APPLY-002 changed");
    expect(r.code, r.err).toBe(0);
    expect(p.read(TASKS)).toContain("- [ ] 1.1 Do.");
    expect(existsSync(p.path(".ctx/evidence/005/1.1.json"))).toBe(false);
    expect(existsSync(p.path(".ctx/evidence/005/1.1.reopened-1.json"))).toBe(true);
    const h = p.read(".ctx/handoff.md");
    expect(h).toMatch(/\nreopened:\n- 005\/1\.1 REQ-APPLY-002 changed \(at \S+\)\n/);
    // a second cycle keeps both old files
    await p.run("task", "done", "005/1.1");
    await p.run("task", "reopen", "005/1.1", "again");
    expect(existsSync(p.path(".ctx/evidence/005/1.1.reopened-2.json"))).toBe(true);
    expect((await p.run("check", "--strict")).out).not.toContain("005/1.1");
  });

  test("an open task, a missing reason, and an archived task exit 2", async () => {
    p = new Project();
    expect((await p.run("task", "reopen", "001/1.2", "why")).code).toBe(2);
    expect((await p.run("task", "reopen", "001/1.1")).code).toBe(2);
    p.write("openspec/changes/archive/2026-10-01-004-old/tasks.md", "# Tasks\n\n- [x] 1.1 Old. [REQ-AAA-001] Verify: `true`\n");
    expect((await p.run("task", "reopen", "004/1.1", "why")).code).toBe(2);
  });
});
