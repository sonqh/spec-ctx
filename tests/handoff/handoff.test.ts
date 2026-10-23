// Covers: REQ-HND-001, REQ-HND-002, REQ-HND-003
import { afterEach, describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => {
  p?.cleanup();
  delete process.env.SPECCTX_NOW;
});

const TASKS = "openspec/changes/002-t/tasks.md";

function setup(): Project {
  const pr = new Project();
  pr.write(TASKS, "# Tasks\n\n## 3. Work\n\n- [ ] 3.1 One. [REQ-AAA-001] Verify: `true`\n- [ ] 3.2 Two. [REQ-AAA-002] Verify: `true`\n- [ ] 3.3 Three. [REQ-AAA-001] Verify: `true`\n");
  return pr;
}

describe("handoff", () => {
  test("SCN-HND-001-1 every section is present and done lists both tasks", async () => {
    p = setup();
    process.env.SPECCTX_NOW = "2026-10-24T10:00:00.000Z";
    await p.run("task", "done", "002/3.1");
    process.env.SPECCTX_NOW = "2026-10-24T10:05:00.000Z";
    await p.run("task", "done", "002/3.2");
    await p.run("task", "start", "002/3.3");
    expect((await p.run("handoff", "write")).code).toBe(0);
    const h = p.read(".ctx/handoff.md");
    expect(h).toBe([
      "# Handoff",
      "change: 001-x",
      "current: 002/3.3",
      "base: none",
      "as_of: 2026-10-24T10:05:00.000Z",
      "done:",
      "- 001/1.1",
      "- 002/3.1",
      "- 002/3.2",
      "reopened:",
      "open_questions:",
      "resolved:",
      "next: 001/1.2  Do beta.",
      "evidence: 3 task(s), 2 command, 1 manual",
      "",
    ].join("\n"));
  });

  test("SCN-HND-001-2 two runs without changes write the same bytes", async () => {
    p = setup();
    await p.run("task", "done", "002/3.1");
    await p.run("handoff", "write");
    const a = readFileSync(p.path(".ctx/handoff.md"));
    await p.run("handoff", "write");
    expect(readFileSync(p.path(".ctx/handoff.md")).equals(a)).toBe(true);
  });

  test("done lists only tasks since the last handoff", async () => {
    p = setup();
    process.env.SPECCTX_NOW = "2026-10-24T10:00:00.000Z";
    await p.run("task", "done", "002/3.1");
    await p.run("handoff", "write");
    process.env.SPECCTX_NOW = "2026-10-24T11:00:00.000Z";
    await p.run("task", "done", "002/3.2");
    await p.run("handoff", "write");
    const h = p.read(".ctx/handoff.md");
    expect(h).toContain("\ndone:\n- 002/3.2\nreopened:");
    expect(h).toContain("base: 2026-10-24T10:00:00.000Z");
  });

  test("SCN-HND-002-1 ask and resolve", async () => {
    p = setup();
    process.env.SPECCTX_NOW = "2026-10-24T12:00:00.000Z";
    await p.run("task", "start", "002/3.1");
    expect((await p.run("handoff", "ask", "exit 1 or 2?")).code).toBe(0);
    expect(p.read(".ctx/handoff.md")).toContain("open_questions:\n- exit 1 or 2? (task 002/3.1, 2026-10-24)\nresolved:");
    expect((await p.run("handoff", "resolve", "1", "exit 2")).code).toBe(0);
    const h = p.read(".ctx/handoff.md");
    expect(h).toContain("open_questions:\nresolved:\n- exit 1 or 2? (task 002/3.1, 2026-10-24) answer: exit 2\n");
    // a new write carries the resolved list
    await p.run("handoff", "write");
    expect(p.read(".ctx/handoff.md")).toContain("- exit 1 or 2? (task 002/3.1, 2026-10-24) answer: exit 2\n");
    expect((await p.run("handoff", "resolve", "1", "x")).code).toBe(2);
    expect((await p.run("handoff", "ask")).code).toBe(2);
  });

  test("open questions carry over to the next write", async () => {
    p = setup();
    await p.run("handoff", "ask", "first?");
    await p.run("handoff", "ask", "second?");
    await p.run("task", "done", "002/3.1");
    await p.run("handoff", "write");
    const h = p.read(".ctx/handoff.md");
    expect(h).toMatch(/open_questions:\n- first\? \(task none, \S+\)\n- second\? \(task none, \S+\)\n/);
  });

  test("SCN-HND-003-1 status prints the current task and the question count", async () => {
    p = setup();
    await p.run("task", "start", "002/3.1");
    await p.run("handoff", "ask", "which exit code?");
    const r = await p.run("status");
    expect(r.out).toContain("current: 002/3.1\n");
    expect(r.out).toContain("open_questions: 1\n");
    expect(JSON.parse((await p.run("status", "--json")).out)).toMatchObject({ current: "002/3.1", open_questions: [expect.stringContaining("which exit code?")] });
  });
});
