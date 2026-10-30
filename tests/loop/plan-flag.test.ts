// Covers: REQ-LOOP-007, REQ-LOOP-009, SCN-LOOP-007-4, SCN-LOOP-009-1, SCN-LOOP-009-3, SCN-LOOP-009-4
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { chmodSync } from "node:fs";
import { NO_ID_FIXTURE, Project } from "../helpers.ts";

// A design question during planning does not end the plan stop. Only --plan does.
let p: Project;
const CHANGE = "add-mfa";
const TASKS = `openspec/changes/${CHANGE}/tasks.md`;
const SPEC = `openspec/changes/${CHANGE}/specs/user-auth/spec.md`;
const Q = `plan ready for ${CHANGE}. Approve to start the tasks?`;
const questions = (): Record<string, unknown>[] => JSON.parse(p.read(".ctx/questions.json")) as Record<string, unknown>[];

async function next(): Promise<Record<string, unknown>> {
  const r = await p.run("next", "--json");
  expect(r.code, r.err).toBe(0);
  return JSON.parse(r.out) as Record<string, unknown>;
}

beforeAll(() => {
  delete process.env.SPECCTX_RERUN;
  p = new Project(NO_ID_FIXTURE);
  p.write("osstub/openspec", `#!/bin/sh\necho '${JSON.stringify({ isPlanningComplete: true, nextSteps: [] })}'\n`);
  chmodSync(p.path("osstub/openspec"), 0o755);
  process.env.SPECCTX_OPENSPEC = p.path("osstub/openspec");
  p.write(SPEC, "# user-auth\n\n## ADDED Requirements\n\n### Requirement: REQ-UA-001 Second factor\nThe system SHALL ask for a TOTP code after a valid password.\n\n#### Scenario: SCN-UA-001-1 Valid code\n- **WHEN** the user enters the current TOTP code\n- **THEN** the system opens a session\n");
  p.write(TASKS, "# Tasks\n\n## 1. Second factor\n\n- [ ] 1.1 Add the TOTP secret store [REQ-UA-001] Verify: `node -e 0`\n");
  p.touchForward(SPEC);
  p.touchForward(TASKS);
});

afterAll(() => {
  delete process.env.SPECCTX_OPENSPEC;
  p?.cleanup();
});

describe("the plan marker", () => {
  test("SCN-LOOP-009-1 the plan stop on a fresh change prints the --plan command", async () => {
    expect(await next()).toMatchObject({ action: "ask", human: true, state: "plan_stop", task: null, command: `specctx handoff ask --change ${CHANGE} --plan "${Q}"` });
  });

  test("SCN-LOOP-007-4 stage by flag", async () => {
    expect((await p.run("handoff", "ask", "--change", CHANGE, "which cache?")).code).toBe(0);
    expect(questions()[0]).toMatchObject({ n: 1, stage: "design" });
    expect((await p.run("handoff", "resolve", "1", "redis")).code).toBe(0);
    const bad = await p.run("handoff", "ask", "--plan", "no change");
    expect(bad.code).toBe(2);
  });

  test("SCN-LOOP-009-4 a resolved design question keeps the plan stop", async () => {
    expect(await next()).toMatchObject({ action: "ask", state: "plan_stop", command: `specctx handoff ask --change ${CHANGE} --plan "${Q}"` });
  });

  test("SCN-LOOP-009-3 a resolved --plan question ends the plan stop", async () => {
    expect((await p.run("handoff", "ask", "--change", CHANGE, "--plan", Q)).code).toBe(0);
    expect(questions()[1]).toMatchObject({ n: 2, stage: "plan" });
    expect((await p.run("handoff", "resolve", "2", "--approve", "yes")).code).toBe(0);
    expect(await next()).toMatchObject({ action: "start", human: false, task: `${CHANGE}/1.1` });
  });
});
