// Covers: REQ-LOOP-002, REQ-TASK-003, REQ-HND-002
import { afterEach, describe, expect, test } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => {
  p?.cleanup();
  delete process.env.SPECCTX_NOW;
});

const TASKS = "openspec/changes/002-t/tasks.md";
const BODY = "# Tasks\n\n## 2. Work\n\n- [ ] 2.1 Pass. [REQ-AAA-001] Verify: `echo ok`\n- [ ] 2.2 Fail. [REQ-AAA-001] Verify: `echo first && echo bad && exit 1`\n";
const BLOCKED = (k: number): string => `blocked: question ${k} written. Run specctx handoff resolve ${k} "<answer>" to continue.`;

function setup(): Project {
  const pr = new Project();
  pr.write(TASKS, BODY);
  return pr;
}

const fails = (pr: Project): string[] => readdirSync(pr.path(".ctx/evidence/002")).filter((n) => n.includes(".fail-")).sort();

describe("fail files", () => {
  test("SCN-LOOP-002-1 the first failure writes a fail file with attempt 1 and no evidence", async () => {
    p = setup();
    process.env.SPECCTX_NOW = "2026-10-28T10:00:00.000Z";
    await p.run("task", "start", "002/2.2");
    process.env.SPECCTX_NOW = "2026-10-28T10:01:00.000Z";
    const r = await p.run("task", "done", "002/2.2");
    expect(r.code).toBe(1);
    expect(r.out).toBe("first\nbad\nVerify failed (exit 1). The task stays open.\n");
    expect(existsSync(p.path(".ctx/evidence/002/2.2.json"))).toBe(false);
    const f = JSON.parse(p.read(".ctx/evidence/002/2.2.fail-1.json"));
    expect(Object.keys(f)).toEqual(["at", "attempt", "stderr_tail", "task", "verify"]);
    expect(f).toEqual({
      at: "2026-10-28T10:01:00.000Z", attempt: 1, stderr_tail: "first\nbad", task: "002/2.2",
      verify: { command: "echo first && echo bad && exit 1", exit: 1 },
    });
    expect(p.read(TASKS)).toBe(BODY);
    // the json form carries the attempt, the file, and no question
    const j = await p.run("task", "done", "002/2.2", "--json");
    expect(j.code).toBe(1);
    expect(JSON.parse(j.out)).toMatchObject({ attempt: 2, fail: ".ctx/evidence/002/2.2.fail-2.json", question: null, exit: 1, task: "002/2.2" });
  });

  test("SCN-LOOP-002-2 the cap writes one question and the blocked line, and a fourth run adds none", async () => {
    p = setup();
    await p.run("task", "start", "002/2.2");
    expect((await p.run("task", "done", "002/2.2")).out).not.toContain("blocked:");
    expect((await p.run("task", "done", "002/2.2")).out).not.toContain("blocked:");
    const r = await p.run("task", "done", "002/2.2");
    expect(r.code).toBe(1);
    expect(r.out).toBe(`first\nbad\nVerify failed (exit 1). The task stays open.\n${BLOCKED(1)}\n`);
    const qs = JSON.parse(p.read(".ctx/questions.json"));
    expect(qs).toHaveLength(1);
    expect(qs[0]).toMatchObject({ n: 1, task: "002/2.2", status: "open", text: "task 002/2.2 failed Verify 3 times. Last: bad. What should change?" });
    // a fourth run names the same question and adds no second one
    const again = await p.run("task", "done", "002/2.2", "--json");
    expect(again.code).toBe(1);
    expect(JSON.parse(again.out)).toMatchObject({ attempt: 4, question: 1 });
    expect(JSON.parse(p.read(".ctx/questions.json"))).toHaveLength(1);
    expect(fails(p)).toEqual(["2.2.fail-1.json", "2.2.fail-2.json", "2.2.fail-3.json", "2.2.fail-4.json"]);
    // a lower cap from the config
    p.write("spec-ctx.toml", "[loop]\nmax_attempts = 1\n");
    p.write(TASKS, BODY.replace("2.1 Pass. [REQ-AAA-001] Verify: `echo ok`", "2.1 Pass. [REQ-AAA-001] Verify: `exit 3`"));
    p.touchForward(TASKS);
    const one = await p.run("task", "done", "002/2.1");
    expect(one.out.trimEnd().split("\n").pop()).toBe(BLOCKED(2));
    expect(JSON.parse(p.read(".ctx/questions.json"))[1].text).toBe("task 002/2.1 failed Verify 1 times. Last: no output. What should change?");
  });

  test("SCN-LOOP-002-5 the cap question quotes the failing line", async () => {
    p = new Project();
    p.write(TASKS, "# Tasks\n\n## 2. Work\n\n- [ ] 2.2 Fail. [REQ-AAA-001] Verify: `echo '$ bun test' && echo 'FAIL two' && echo '1 fail' && exit 1`\n");
    await p.run("task", "start", "002/2.2");
    await p.run("task", "done", "002/2.2");
    await p.run("task", "done", "002/2.2");
    await p.run("task", "done", "002/2.2");
    const qs = JSON.parse(p.read(".ctx/questions.json"));
    expect(qs[0].text).toBe("task 002/2.2 failed Verify 3 times. Last: FAIL two. What should change?");
  });

  test("SCN-LOOP-002-3 fail files before task start do not count, a resolve resets, and no current.json counts all", async () => {
    p = setup();
    // two failures with no current task
    process.env.SPECCTX_NOW = "2026-10-28T10:00:00.000Z";
    expect(JSON.parse((await p.run("task", "done", "002/2.2", "--json")).out).attempt).toBe(1);
    expect(JSON.parse((await p.run("task", "done", "002/2.2", "--json")).out).attempt).toBe(2);
    // task start opens a new window, and the file name keeps counting
    process.env.SPECCTX_NOW = "2026-10-28T11:00:00.000Z";
    await p.run("task", "start", "002/2.2");
    process.env.SPECCTX_NOW = "2026-10-28T11:01:00.000Z";
    const r = JSON.parse((await p.run("task", "done", "002/2.2", "--json")).out);
    expect(r.attempt).toBe(1);
    expect(r.fail).toBe(".ctx/evidence/002/2.2.fail-3.json");
    // reach the cap, resolve, and the next failure is attempt 1 again
    process.env.SPECCTX_NOW = "2026-10-28T11:02:00.000Z";
    await p.run("task", "done", "002/2.2");
    process.env.SPECCTX_NOW = "2026-10-28T11:03:00.000Z";
    expect(JSON.parse((await p.run("task", "done", "002/2.2", "--json")).out).question).toBe(1);
    process.env.SPECCTX_NOW = "2026-10-28T11:04:00.000Z";
    expect((await p.run("handoff", "resolve", "1", "use the new fixture")).code).toBe(0);
    process.env.SPECCTX_NOW = "2026-10-28T11:05:00.000Z";
    const after = JSON.parse((await p.run("task", "done", "002/2.2", "--json")).out);
    expect(after.attempt).toBe(1);
    expect(after.question).toBe(null);
    expect(JSON.parse(p.read(".ctx/questions.json"))).toHaveLength(1);
  });

  test("SCN-LOOP-002-4 a fail file is not evidence for check, stats, or handoff, and a pass keeps it", async () => {
    p = setup();
    await p.run("task", "done", "002/2.2");
    expect(existsSync(p.path(".ctx/evidence/002/2.2.fail-1.json"))).toBe(true);
    const c = await p.run("check", "--strict");
    expect(c.out).not.toContain("evidence-without-done");
    expect(c.out).not.toContain("fail-1");
    const s = JSON.parse((await p.run("stats", "--json")).out);
    expect(s.rows.find((r: { change: string }) => r.change === "002-t")).toBeUndefined();
    const h = await p.run("handoff", "write");
    expect(h.code).toBe(0);
    expect(p.read(".ctx/handoff.md")).not.toContain("2.2");
    // a passing run writes the evidence and keeps the fail file
    p.write(TASKS, BODY.replace("Verify: `echo first && echo bad && exit 1`", "Verify: `true`"));
    p.touchForward(TASKS);
    expect((await p.run("task", "done", "002/2.2")).code).toBe(0);
    expect(existsSync(p.path(".ctx/evidence/002/2.2.json"))).toBe(true);
    expect(existsSync(p.path(".ctx/evidence/002/2.2.fail-1.json"))).toBe(true);
    expect((await p.run("check", "--strict")).out).not.toContain("evidence-without-done");
    expect(JSON.parse((await p.run("stats", "--json")).out).rows.find((r: { change: string }) => r.change === "002-t").evidence_ratio.n).toBe(1);
  });
});
