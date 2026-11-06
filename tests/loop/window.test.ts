// Covers: REQ-LOOP-018, REQ-LOOP-002, REQ-STAT-002
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { existsSync } from "node:fs";
import { OPENSPEC_STUB, Project } from "../helpers.ts";

// The attempt window without a current task (056/D3, 056/D4). Fail files from another clone never count.

let p: Project;
beforeEach(() => {
  delete process.env.SPECCTX_RERUN;
  process.env.SPECCTX_OPENSPEC = OPENSPEC_STUB;
});
afterEach(() => {
  delete process.env.SPECCTX_OPENSPEC;
  delete process.env.SPECCTX_NOW;
  p?.cleanup();
});

const TASKS = "openspec/changes/002-t/tasks.md";
const BODY = "# Tasks\n\n## 2. Work\n\n- [ ] 2.1 Other. [REQ-AAA-001] Verify: `test -f other.txt`\n- [ ] 2.2 Flag. [REQ-AAA-001] Verify: `test -f flag.txt`\n";

/** A fail file as another clone wrote and committed it. */
function oldFail(pr: Project, n: number): void {
  pr.write(`.ctx/evidence/002/2.2.fail-${n}.json`, JSON.stringify({
    at: `2026-01-0${n}T00:00:00.000Z`, attempt: n, stderr_tail: "elsewhere", task: "002/2.2", verify: { command: "test -f flag.txt", exit: 1 },
  }) + "\n");
}

function setup(): Project {
  const pr = new Project();
  pr.write(TASKS, BODY);
  oldFail(pr, 1);
  oldFail(pr, 2);
  return pr;
}

const done = async (task: string): Promise<{ attempt: number; question: number | null; fail: string }> => JSON.parse((await p.run("task", "done", task, "--json")).out);
const next = async (): Promise<Record<string, unknown>> => JSON.parse((await p.run("next", "--json", "--change", "002-t")).out);

describe("attempt window without a current task", () => {
  test("SCN-LOOP-018-1 fail files from another clone do not count on a fresh clone", async () => {
    p = setup();
    expect(existsSync(p.path(".ctx/current.json"))).toBe(false);
    process.env.SPECCTX_NOW = "2026-11-05T10:00:00.000Z";
    const r = await done("002/2.2");
    expect(r.attempt).toBe(1);
    expect(r.question).toBe(null);
    expect(r.fail).toBe(".ctx/evidence/002/2.2.fail-3.json");
    expect(existsSync(p.path(".ctx/questions.json"))).toBe(false);
    expect(JSON.parse(p.read(".ctx/current.json")).task).toBe("002/2.2");
    expect(await next()).toMatchObject({ action: "fix", attempt: 1, task: "002/2.2" });
  });

  test("SCN-LOOP-018-2 the cap still stops a loop that never ran task start", async () => {
    p = setup();
    process.env.SPECCTX_NOW = "2026-11-05T10:00:00.000Z";
    expect(await done("002/2.2")).toMatchObject({ attempt: 1, question: null });
    process.env.SPECCTX_NOW = "2026-11-05T10:01:00.000Z";
    expect(await done("002/2.2")).toMatchObject({ attempt: 2, question: null });
    process.env.SPECCTX_NOW = "2026-11-05T10:02:00.000Z";
    expect(await done("002/2.2")).toMatchObject({ attempt: 3, question: 1 });
    const qs = JSON.parse(p.read(".ctx/questions.json"));
    expect(qs).toHaveLength(1);
    expect(qs[0]).toMatchObject({ task: "002/2.2", stage: "cap", status: "open" });
  });

  test("SCN-LOOP-018-3 a current.json that names another task gives way to the failed task", async () => {
    p = setup();
    process.env.SPECCTX_NOW = "2026-11-05T09:00:00.000Z";
    expect((await p.run("task", "start", "002/2.1")).code).toBe(0);
    process.env.SPECCTX_NOW = "2026-11-05T10:00:00.000Z";
    expect(await done("002/2.2")).toMatchObject({ attempt: 1, question: null });
    expect(JSON.parse(p.read(".ctx/current.json"))).toEqual({ started_at: "2026-11-05T10:00:00.000Z", task: "002/2.2" });
    expect(await next()).toMatchObject({ action: "fix", attempt: 1, task: "002/2.2" });
  });

  test("SCN-LOOP-018-4 cycle time needs task start", async () => {
    p = setup();
    process.env.SPECCTX_NOW = "2026-11-05T10:00:00.000Z";
    await done("002/2.2");
    p.write("flag.txt", "x\n");
    process.env.SPECCTX_NOW = "2026-11-05T10:05:00.000Z";
    expect((await p.run("task", "done", "002/2.2")).code).toBe(0);
    const ev = JSON.parse(p.read(".ctx/evidence/002/2.2.json"));
    expect(ev.started_at).toBeUndefined();
    expect(ev.bundle_chars).toBeUndefined();
    // after task start a pass copies both
    expect((await p.run("task", "reopen", "002/2.2", "again")).code).toBe(0);
    process.env.SPECCTX_NOW = "2026-11-05T11:00:00.000Z";
    expect((await p.run("task", "start", "002/2.2")).code).toBe(0);
    process.env.SPECCTX_NOW = "2026-11-05T11:05:00.000Z";
    expect((await p.run("task", "done", "002/2.2")).code).toBe(0);
    const again = JSON.parse(p.read(".ctx/evidence/002/2.2.json"));
    expect(again.started_at).toBe("2026-11-05T11:00:00.000Z");
    expect(typeof again.bundle_chars).toBe("number");
  });
});
