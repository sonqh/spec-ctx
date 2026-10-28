// Covers: REQ-HND-001, REQ-HND-002, REQ-HND-003
import { afterEach, describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";
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
    expect(p.read(".ctx/handoff.md")).toContain("open_questions:\n- Q1 exit 1 or 2? (task 002/3.1, 2026-10-24)\nresolved:");
    expect((await p.run("handoff", "resolve", "1", "exit 2")).code).toBe(0);
    const h = p.read(".ctx/handoff.md");
    expect(h).toContain("open_questions:\nresolved:\n- Q1 exit 1 or 2? (task 002/3.1, 2026-10-24) answer: exit 2\n");
    // a new write carries the resolved list
    await p.run("handoff", "write");
    expect(p.read(".ctx/handoff.md")).toContain("- Q1 exit 1 or 2? (task 002/3.1, 2026-10-24) answer: exit 2\n");
    expect((await p.run("handoff", "resolve", "1", "x")).code).toBe(2);
    expect((await p.run("handoff", "ask")).code).toBe(2);
  });

  test("SCN-HND-002-2 ask writes questions.json with n, task, status, and the time (022/D6)", async () => {
    p = setup();
    process.env.SPECCTX_NOW = "2026-10-24T12:00:00.000Z";
    await p.run("task", "start", "002/3.1");
    const r = await p.run("handoff", "ask", "first?");
    expect(r.code).toBe(0);
    expect(r.out).toBe("open question 1 added\n");
    expect(JSON.parse(p.read(".ctx/questions.json"))).toEqual([{ n: 1, asked_at: "2026-10-24T12:00:00.000Z", task: "002/3.1", text: "first?", status: "open" }]);
    // the n comes from the highest n in the file, not from the count of open questions
    await p.run("handoff", "ask", "second?");
    await p.run("handoff", "resolve", "1", "yes");
    expect((await p.run("handoff", "ask", "third?")).out).toBe("open question 3 added\n");
    expect(JSON.parse(p.read(".ctx/questions.json")).map((q: { n: number }) => q.n)).toEqual([1, 2, 3]);
    // the JSON output of ask carries the rendered list
    const j = JSON.parse((await p.run("handoff", "ask", "fourth?", "--json")).out);
    expect(j.open_questions).toEqual(["Q2 second? (task 002/3.1, 2026-10-24)", "Q3 third? (task 002/3.1, 2026-10-24)", "Q4 fourth? (task 002/3.1, 2026-10-24)"]);
  });

  test("SCN-HND-002-3 resolve takes the n of the question and refuses a number that is not open (022/D6)", async () => {
    p = setup();
    process.env.SPECCTX_NOW = "2026-10-24T12:00:00.000Z";
    await p.run("handoff", "ask", "one?");
    await p.run("handoff", "ask", "two?");
    process.env.SPECCTX_NOW = "2026-10-24T13:00:00.000Z";
    const r = await p.run("handoff", "resolve", "1", "yes");
    expect(r.code).toBe(0);
    expect(r.out).toBe("resolved question 1\n");
    const qs = JSON.parse(p.read(".ctx/questions.json"));
    expect(qs[0]).toEqual({ n: 1, asked_at: "2026-10-24T12:00:00.000Z", task: "none", text: "one?", status: "resolved", answer: "yes", resolved_at: "2026-10-24T13:00:00.000Z" });
    expect(qs[1].status).toBe("open");
    const h = p.read(".ctx/handoff.md");
    expect(h).toContain("open_questions:\n- Q2 two? (task none, 2026-10-24)\nresolved:\n- Q1 one? (task none, 2026-10-24) answer: yes\n");
    const again = await p.run("handoff", "resolve", "1", "again");
    expect(again.code).toBe(2);
    expect(again.err).toContain("no open question 1");
    expect((await p.run("handoff", "resolve", "9", "x")).code).toBe(2);
    expect((await p.run("handoff", "resolve", "2")).code).toBe(2);
    // nothing else reads handoff.md for questions: a hand edit of the file changes no list
    p.write(".ctx/handoff.md", p.read(".ctx/handoff.md").replace("- Q2 two?", "- Q2 edited?"));
    await p.run("handoff", "write");
    expect(p.read(".ctx/handoff.md")).toContain("- Q2 two? (task none, 2026-10-24)\n");
  });

  test("the resolved list shows the last 10 and names the rest (022/D7)", async () => {
    p = setup();
    process.env.SPECCTX_NOW = "2026-10-24T12:00:00.000Z";
    for (let i = 1; i <= 12; i++) await p.run("handoff", "ask", `q${i}?`);
    for (let i = 1; i <= 11; i++) await p.run("handoff", "resolve", String(i), `a${i}`);
    const h = p.read(".ctx/handoff.md");
    expect(h).toContain("open_questions:\n- Q12 q12? (task none, 2026-10-24)\nresolved:\n- Q2 q2? (task none, 2026-10-24) answer: a2\n");
    expect(h).not.toContain("- Q1 q1?");
    expect(h).toContain("- Q11 q11? (task none, 2026-10-24) answer: a11\n- and 1 more in .ctx/questions.json\nnext:");
    expect(JSON.parse(p.read(".ctx/questions.json"))).toHaveLength(12);
  });

  test("SCN-HND-002-4 handoff write migrates the questions of an old handoff.md once (022/D8)", async () => {
    p = setup();
    await p.run("task", "done", "002/3.1");
    const old = [
      "# Handoff",
      "change: 002-t",
      "current: none",
      "base: none",
      "as_of: none",
      "done:",
      "reopened:",
      "open_questions:",
      "- Keep the flag? (task 002/3.2, 2026-10-23)",
      "resolved:",
      "- Exit 1 or 2? (task none, 2026-10-20) answer: exit 2",
      "- Second question",
      "  with a continuation line (task 002/3.1, 2026-10-21) answer: yes",
      "next: x",
      "evidence: x",
      "",
    ].join("\n");
    p.write(".ctx/handoff.md", old);
    const r = await p.run("handoff", "write");
    expect(r.code).toBe(0);
    expect(r.out).toBe("migrated 3 question(s) to .ctx/questions.json\nwrote .ctx/handoff.md\n");
    expect(JSON.parse(p.read(".ctx/questions.json"))).toEqual([
      { n: 1, asked_at: "2026-10-20", task: "none", text: "Exit 1 or 2?", status: "resolved", answer: "exit 2" },
      { n: 2, asked_at: "2026-10-21", task: "002/3.1", text: "Second question with a continuation line", status: "resolved", answer: "yes" },
      { n: 3, asked_at: "2026-10-23", task: "002/3.2", text: "Keep the flag?", status: "open" },
    ]);
    const h = p.read(".ctx/handoff.md");
    expect(h).toContain("open_questions:\n- Q3 Keep the flag? (task 002/3.2, 2026-10-23)\nresolved:\n- Q1 Exit 1 or 2? (task none, 2026-10-20) answer: exit 2\n- Q2 Second question with a continuation line (task 002/3.1, 2026-10-21) answer: yes\n");
    // a second run prints no migrated line, and an empty questions.json is not a reason to migrate again
    const again = await p.run("handoff", "write");
    expect(again.out).toBe("wrote .ctx/handoff.md\n");
    p.write(".ctx/questions.json", "[]\n");
    p.write(".ctx/handoff.md", old);
    expect((await p.run("handoff", "write")).out).toBe("wrote .ctx/handoff.md\n");
    expect(p.read(".ctx/handoff.md")).toContain("open_questions:\nresolved:\n");
    // no questions.json and no questions in the old file: nothing to migrate
    p.cleanup();
    p = setup();
    await p.run("handoff", "write");
    expect(existsSync(p.path(".ctx/questions.json"))).toBe(false);
    expect((await p.run("handoff", "write")).out).toBe("wrote .ctx/handoff.md\n");
  });

  test("open questions carry over to the next write", async () => {
    p = setup();
    await p.run("handoff", "ask", "first?");
    await p.run("handoff", "ask", "second?");
    await p.run("task", "done", "002/3.1");
    await p.run("handoff", "write");
    const h = p.read(".ctx/handoff.md");
    expect(h).toMatch(/open_questions:\n- Q1 first\? \(task none, \S+\)\n- Q2 second\? \(task none, \S+\)\n/);
  });

  test("SCN-HND-003-1 status prints the current task and the question count", async () => {
    p = setup();
    await p.run("task", "start", "002/3.1");
    await p.run("handoff", "ask", "which exit code?");
    const r = await p.run("status");
    expect(r.out).toContain("current: 002/3.1\n");
    expect(r.out).toContain("open_questions: 1\n");
    expect(JSON.parse((await p.run("status", "--json")).out)).toMatchObject({ current: "002/3.1", open_questions: [expect.stringContaining("which exit code?")] });
    // status reads questions.json, so the count stands without a handoff file
    const { rmSync } = await import("node:fs");
    rmSync(p.path(".ctx/handoff.md"));
    const j = JSON.parse((await p.run("status", "--json")).out);
    expect(j.open_questions).toHaveLength(1);
    expect(j.handoff).toBe(false);
  });
});
