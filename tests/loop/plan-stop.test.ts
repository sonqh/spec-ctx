// Covers: REQ-LOOP-005, REQ-LOOP-009, REQ-LOOP-015, REQ-LOOP-016, REQ-HND-002
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { chmodSync } from "node:fs";
import { NO_ID_FIXTURE, Project } from "../helpers.ts";

// The plan stop of 029/D1 on a copy of the no-ID fixture with planning complete and cited tasks.
// SPECCTX_OPENSPEC points at a stub that prints a complete OpenSpec status, so nothing reaches the network.

let p: Project;
const CHANGE = "add-mfa";
const TASKS = `openspec/changes/${CHANGE}/tasks.md`;
const SPEC = `openspec/changes/${CHANGE}/specs/user-auth/spec.md`;
const Q = `plan ready for ${CHANGE}. Approve to start the tasks?`;

async function next(): Promise<Record<string, unknown>> {
  const r = await p.run("next", "--json");
  expect(r.code, r.err).toBe(0);
  return JSON.parse(r.out) as Record<string, unknown>;
}

function fresh(): void {
  p = new Project(NO_ID_FIXTURE);
  const os = p.path("osstub/openspec");
  p.write("osstub/openspec", `#!/bin/sh\necho '${JSON.stringify({ isPlanningComplete: true, nextSteps: [] })}'\n`);
  chmodSync(os, 0o755);
  process.env.SPECCTX_OPENSPEC = os;
  p.write(SPEC, "# user-auth\n\n## ADDED Requirements\n\n### Requirement: REQ-UA-001 Second factor\nThe system SHALL ask for a TOTP code after a valid password.\n\n#### Scenario: SCN-UA-001-1 Valid code\n- **WHEN** the user enters the current TOTP code\n- **THEN** the system opens a session\n");
  p.write(TASKS, "# Tasks\n\n## 1. Second factor\n\n- [ ] 1.1 Add the TOTP secret store [REQ-UA-001] Verify: `node -e 0`\n");
  p.touchForward(SPEC);
  p.touchForward(TASKS);
}

beforeAll(fresh);

afterAll(() => {
  delete process.env.SPECCTX_OPENSPEC;
  p?.cleanup();
});

describe("the plan stop lives in the engine", () => {
  test("SCN-LOOP-005-1 handoff ask --change blocks the change with ask and human true", async () => {
    // SCN-LOOP-009-1 the engine asks for the plan stop and prints the command
    expect(await next()).toEqual({
      action: "ask", attempt: 0, change: CHANGE, command: `specctx handoff ask --change ${CHANGE} --plan "${Q}"`, human: true, max_attempts: 3, reason: Q, state: "plan_stop", task: null, tasks: [],
    });
    const a = await p.run("handoff", "ask", "--change", CHANGE, "--plan", Q);
    expect(a.code, a.err).toBe(0);
    expect(a.out).toBe("open question 1 added\n");
    const qs = JSON.parse(p.read(".ctx/questions.json")) as Record<string, unknown>[];
    expect(qs).toHaveLength(1);
    expect(qs[0]).toMatchObject({ n: 1, task: CHANGE, text: Q, status: "open", stage: "plan" });
    expect(await next()).toEqual({
      action: "ask", attempt: 0, change: CHANGE, command: 'specctx handoff resolve 1 <--approve|--reject> "<answer>"', human: true, max_attempts: 3, reason: Q, state: "question_open", task: null, tasks: [],
    });
  });

  test("SCN-LOOP-005-2 handoff resolve ends the stop, and an unknown change exits 2", async () => {
    const r = await p.run("handoff", "resolve", "1", "--approve", "yes");
    expect(r.code, r.err).toBe(0);
    expect(await next()).toMatchObject({ action: "start", human: false, task: `${CHANGE}/1.1` });
    const bad = await p.run("handoff", "ask", "--change", "999", "x");
    expect(bad.code).toBe(2);
    expect(bad.err).toContain("no active change 999");
    expect(JSON.parse(p.read(".ctx/questions.json"))).toHaveLength(1);
  });

  test("SCN-LOOP-005-1 the key works for --change and the question stores the full folder name", async () => {
    const q = new Project(NO_ID_FIXTURE);
    try {
      const k = await q.run("handoff", "ask", "--change", "add-mfa", "first?");
      expect(k.code, k.err).toBe(0);
      expect((JSON.parse(q.read(".ctx/questions.json")) as { task: string }[])[0]!.task).toBe(CHANGE);
      // without the flag the question keeps the current task, which is none here
      await q.run("handoff", "ask", "second?");
      expect((JSON.parse(q.read(".ctx/questions.json")) as { task: string }[])[1]!.task).toBe("none");
    } finally {
      q.cleanup();
    }
  });
});

describe("the plan stop rule", () => {
  test("SCN-LOOP-009-3 no plan stop after the plan question, a started task, or a done task", async () => {
    expect((await next()).state).toBe("task_open");
    p.write(".ctx/questions.json", "[]\n");
    expect((await next()).state).toBe("plan_stop");
    // a current task of the change
    expect((await p.run("task", "start", `${CHANGE}/1.1`)).code).toBe(0);
    expect((await next()).state).toBe("task_started");
    // a ticked task
    p.write(TASKS, p.read(TASKS).replace("- [ ]", "- [x]"));
    p.touchForward(TASKS);
    expect((await next()).state).not.toBe("plan_stop");
  });
});

describe("the verdict at the plan stop", () => {
  beforeEach(() => {
    p.cleanup();
    fresh();
  });

  const ASK = `specctx handoff ask --change ${CHANGE} --plan "${Q}"`;
  const ask = async (): Promise<void> => expect((await p.run("handoff", "ask", "--change", CHANGE, "--plan", Q)).code).toBe(0);
  const resolve = async (n: number, flag: string, answer: string): Promise<void> => {
    const r = await p.run("handoff", "resolve", String(n), flag, answer);
    expect(r.code, r.err).toBe(0);
  };
  const OLD = (extra: Record<string, unknown> = {}): string => JSON.stringify([{ n: 1, asked_at: "2026-10-28", task: CHANGE, text: Q, status: "resolved", answer: "yes", resolved_at: "2026-10-28", stage: "plan", ...extra }]) + "\n";
  const rejected = (n: number, answer: string): Record<string, unknown> => ({ action: "ask", human: true, state: "plan_stop", command: ASK, reason: `plan rejected in question ${n}: ${answer}` });

  test("SCN-LOOP-015-2 a rejected plan question holds the stop until a new one is approved", async () => {
    await ask();
    await resolve(1, "--reject", "Split task 2");
    expect(await next()).toMatchObject(rejected(1, "Split task 2"));
    await ask();
    await resolve(2, "--approve", "yes");
    expect(await next()).toMatchObject({ action: "start", human: false, task: `${CHANGE}/1.1` });
  });

  test("SCN-LOOP-015-3 an open plan question shows the verdict form and a design question does not", async () => {
    await ask();
    const open = await next();
    expect(open).toMatchObject({ action: "ask", state: "question_open" });
    expect(open.command).toContain("--approve");
    expect(open.command).toContain("--reject");
    p.write(".ctx/questions.json", "[]\n");
    expect((await p.run("handoff", "ask", "--change", CHANGE, "which cache?")).code).toBe(0);
    expect((await next()).command).toBe('specctx handoff resolve 1 "<answer>"');
  });

  test("SCN-LOOP-015-4 a rejection beats the started guard", async () => {
    await ask();
    await resolve(1, "--reject", "Split task 2");
    // a current task of the change
    expect((await p.run("task", "start", `${CHANGE}/1.1`)).code).toBe(0);
    expect(await next()).toMatchObject(rejected(1, "Split task 2"));
    // a ticked task
    p.write(TASKS, p.read(TASKS).replace("- [ ]", "- [x]"));
    p.touchForward(TASKS);
    expect(await next()).toMatchObject(rejected(1, "Split task 2"));
    // the printed command stores a plan question, even with every task [x]
    await ask();
    await resolve(2, "--approve", "yes");
    expect((await next()).state).not.toBe("plan_stop");
  });

  test("SCN-LOOP-015-5 the highest number decides at the plan stop", async () => {
    await ask();
    await resolve(1, "--approve", "yes");
    expect((await next()).state).toBe("task_open");
    await ask();
    await resolve(2, "--reject", "Wait");
    expect(await next()).toMatchObject(rejected(2, "Wait"));
    await ask();
    await resolve(3, "--approve", "yes");
    expect((await next()).state).toBe("task_open");
  });

  test("SCN-LOOP-016-1 a resolved plan question with no verdict is not an approval", async () => {
    p.write(".ctx/questions.json", OLD());
    expect(await next()).toMatchObject({ action: "ask", human: true, state: "plan_stop", command: ASK, reason: Q });
  });

  test("SCN-LOOP-016-3 a question with no verdict does not stop a change that started", async () => {
    p.write(".ctx/questions.json", OLD());
    expect((await p.run("task", "start", `${CHANGE}/1.1`)).code).toBe(0);
    expect((await next()).state).toBe("task_started");
    p.write(TASKS, p.read(TASKS).replace("- [ ]", "- [x]"));
    p.touchForward(TASKS);
    expect((await next()).state).not.toBe("plan_stop");
  });
});
