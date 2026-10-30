// Covers: REQ-LOOP-005, REQ-LOOP-009, REQ-HND-002
import { afterAll, beforeAll, describe, expect, test } from "vitest";
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

beforeAll(() => {
  p = new Project(NO_ID_FIXTURE);
  const os = p.path("osstub/openspec");
  p.write("osstub/openspec", `#!/bin/sh\necho '${JSON.stringify({ isPlanningComplete: true, nextSteps: [] })}'\n`);
  chmodSync(os, 0o755);
  process.env.SPECCTX_OPENSPEC = os;
  p.write(SPEC, "# user-auth\n\n## ADDED Requirements\n\n### Requirement: REQ-UA-001 Second factor\nThe system SHALL ask for a TOTP code after a valid password.\n\n#### Scenario: SCN-UA-001-1 Valid code\n- **WHEN** the user enters the current TOTP code\n- **THEN** the system opens a session\n");
  p.write(TASKS, "# Tasks\n\n## 1. Second factor\n\n- [ ] 1.1 Add the TOTP secret store [REQ-UA-001] Verify: `node -e 0`\n");
  p.touchForward(SPEC);
  p.touchForward(TASKS);
});

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
      action: "ask", attempt: 0, change: CHANGE, command: 'specctx handoff resolve 1 "<answer>"', human: true, max_attempts: 3, reason: Q, state: "question_open", task: null, tasks: [],
    });
  });

  test("SCN-LOOP-005-2 handoff resolve ends the stop, and an unknown change exits 2", async () => {
    const r = await p.run("handoff", "resolve", "1", "yes");
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
