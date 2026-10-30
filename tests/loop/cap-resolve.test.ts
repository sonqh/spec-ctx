// Covers: REQ-LOOP-014, REQ-LOOP-002
import { afterEach, describe, expect, test } from "vitest";
import { OPENSPEC_STUB, Project } from "../helpers.ts";

let p: Project;
afterEach(() => {
  delete process.env.SPECCTX_OPENSPEC;
  p?.cleanup();
});

const TASKS = "openspec/changes/002-t/tasks.md";
const BODY = "# Tasks\n\n## 2. Work\n\n- [ ] 2.2 Fail. [REQ-AAA-001] Verify: `test -f flag.txt`\n- [ ] 2.3 Other. [REQ-AAA-001] Verify: `echo ok`\n";
const questions = (): { n: number; task: string; status: string; stage?: string; answer?: string }[] => JSON.parse(p.read(".ctx/questions.json"));

function setup(): Project {
  process.env.SPECCTX_OPENSPEC = OPENSPEC_STUB;
  const pr = new Project();
  pr.write(TASKS, BODY);
  return pr;
}

async function failToCap(): Promise<void> {
  await p.run("task", "start", "002/2.2");
  for (let i = 0; i < 3; i++) await p.run("task", "done", "002/2.2");
}

describe("cap question closes on a pass", () => {
  test("SCN-LOOP-014-1 the cap question has stage cap and a pass resolves it, so next stops asking", async () => {
    p = setup();
    await failToCap();
    expect(questions()).toHaveLength(1);
    expect(questions()[0]).toMatchObject({ task: "002/2.2", status: "open", stage: "cap" });
    expect(JSON.parse((await p.run("next", "--json", "--change", "002-t")).out)).toMatchObject({ action: "ask", state: "question_open" });
    p.write("flag.txt", "x\n");
    const d = await p.run("task", "done", "002/2.2");
    expect(d.code, d.out + d.err).toBe(0);
    expect(questions()[0]).toMatchObject({ status: "resolved", answer: "Verify passed. Resolved by task done." });
    expect(JSON.parse((await p.run("next", "--json", "--change", "002-t")).out).action).not.toBe("ask");
  });

  test("SCN-LOOP-014-1 a reworded cap question resolves", async () => {
    p = setup();
    p.write(".ctx/questions.json", JSON.stringify([
      { n: 1, asked_at: "2026-10-28", task: "002/2.2", text: "Why does this keep failing?", status: "open", stage: "cap" },
    ]) + "\n");
    p.write("flag.txt", "x\n");
    expect((await p.run("task", "done", "002/2.2")).code).toBe(0);
    expect(questions().map((q) => q.status)).toEqual(["resolved"]);
  });

  test("SCN-LOOP-014-2 a plain handoff ask during the task stays open after a pass", async () => {
    p = setup();
    expect((await p.run("task", "start", "002/2.2")).code).toBe(0);
    expect((await p.run("handoff", "ask", "Should the flag live in a fixture?")).code).toBe(0);
    expect(questions()[0]).toMatchObject({ task: "002/2.2", status: "open" });
    expect(questions()[0]!.stage).toBeUndefined();
    p.write("flag.txt", "x\n");
    expect((await p.run("task", "done", "002/2.2")).code).toBe(0);
    expect(questions()[0]!.status).toBe("open");
  });

  test("SCN-LOOP-014-2 plan, design, archive, and other-task questions stay open", async () => {
    p = setup();
    p.write(".ctx/questions.json", JSON.stringify([
      { n: 1, asked_at: "2026-10-28", task: "002-t", text: "plan?", status: "open", stage: "plan" },
      { n: 2, asked_at: "2026-10-28", task: "002-t", text: "design?", status: "open", stage: "design" },
      { n: 3, asked_at: "2026-10-28", task: "002-t", text: "archive?", status: "open", stage: "archive" },
      { n: 4, asked_at: "2026-10-28", task: "002/2.3", text: "other task", status: "open", stage: "cap" },
      { n: 5, asked_at: "2026-10-28", task: "002/2.2", text: "cap", status: "open", stage: "cap" },
    ]) + "\n");
    p.write("flag.txt", "x\n");
    expect((await p.run("task", "done", "002/2.2")).code).toBe(0);
    expect(questions().map((q) => q.status)).toEqual(["open", "open", "open", "open", "resolved"]);
  });
});
