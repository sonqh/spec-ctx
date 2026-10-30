// Covers: REQ-LOOP-007, REQ-LOOP-015, REQ-LOOP-016, REQ-HND-002
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { chmodSync } from "node:fs";
import { NO_ID_FIXTURE, Project } from "../helpers.ts";

// The archive stop of 031/D1 and 031/D2 on a copy of the no-ID fixture with planning complete and cited tasks.
// SPECCTX_OPENSPEC points at a stub that prints a complete OpenSpec status, so nothing reaches the network.

let p: Project;
const CHANGE = "add-mfa";
const TASKS = `openspec/changes/${CHANGE}/tasks.md`;
const SPEC = `openspec/changes/${CHANGE}/specs/user-auth/spec.md`;
const ARCHIVE_Q = `archive ${CHANGE}?`;

type Q = Record<string, unknown>;

async function next(): Promise<Q> {
  const r = await p.run("next", "--json");
  expect(r.code, r.err).toBe(0);
  return JSON.parse(r.out) as Q;
}

const questions = (): Q[] => JSON.parse(p.read(".ctx/questions.json")) as Q[];

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

describe("the archive stop lives in the engine", () => {
  test("SCN-LOOP-007-2 a question with an open task gets stage plan", async () => {
    const a = await p.run("handoff", "ask", "--change", CHANGE, "--plan", "plan ready?");
    expect(a.code, a.err).toBe(0);
    expect(questions()[0]).toMatchObject({ n: 1, task: CHANGE, stage: "plan", status: "open" });
    expect((await p.run("handoff", "resolve", "1", "--approve", "yes")).code).toBe(0);
    const plain = await p.run("handoff", "ask", "no change");
    expect(plain.code, plain.err).toBe(0);
    expect(questions()[1]).not.toHaveProperty("stage");
    expect((await p.run("handoff", "resolve", "2", "ok")).code).toBe(0);
  });

  test("SCN-LOOP-007-1 with every task done and the gate passed, next names the archive question", async () => {
    expect((await p.run("task", "start", `${CHANGE}/1.1`)).code).toBe(0);
    const d = await p.run("task", "done", `${CHANGE}/1.1`);
    expect(d.code, d.out + d.err).toBe(0);
    p.write(".ctx/gate-log.jsonl", JSON.stringify({ at: "2999-01-01T00:00:00.000Z", duration_s: 1, failed_step: null, ok: true, steps: [], strict: true }) + "\n");
    expect(await next()).toMatchObject({ action: "archive", human: true, state: "gate_passed", command: `specctx handoff ask --change ${CHANGE} "${ARCHIVE_Q}"` });
  });

  test("SCN-LOOP-007-2 with every task done the question gets stage archive and next returns ask", async () => {
    const a = await p.run("handoff", "ask", "--change", CHANGE, ARCHIVE_Q);
    expect(a.code, a.err).toBe(0);
    expect(questions()[2]).toMatchObject({ n: 3, task: CHANGE, text: ARCHIVE_Q, stage: "archive", status: "open" });
    expect(await next()).toMatchObject({ action: "ask", human: true, reason: ARCHIVE_Q, state: "question_open", command: 'specctx handoff resolve 3 <--approve|--reject> "<answer>"' });
  });

  test("SCN-LOOP-007-3 resolve approves the archive, and a plan question or an old approval does not", async () => {
    expect((await p.run("handoff", "resolve", "3", "--approve", "yes")).code).toBe(0);
    const os = process.env.SPECCTX_OPENSPEC!;
    expect(await next()).toEqual({
      action: "archive", attempt: 0, change: CHANGE, command: `${os} archive ${CHANGE} -y`, human: false, max_attempts: 3,
      reason: "archive approved in question 3", state: "gate_passed", task: null, tasks: [],
    });
    const saved = p.read(".ctx/questions.json");
    // only a resolved plan question for the change: the stop stays
    p.write(".ctx/questions.json", saved.replace(/"stage": "archive"/, '"stage": "plan"'));
    expect(await next()).toMatchObject({ action: "archive", human: true });
    // an approval resolved before the newest evidence lapses
    p.write(".ctx/questions.json", JSON.stringify(questions().map((q) => (q.n === 3 ? { ...q, stage: "archive", resolved_at: "2000-01-01T00:00:00.000Z" } : q)), null, 2));
    expect(await next()).toMatchObject({ action: "archive", human: true });
    p.write(".ctx/questions.json", saved);
    expect((await next()).human).toBe(false);
  });
});

describe("the verdict at the archive stop", () => {
  const ASK = `specctx handoff ask --change ${CHANGE} "${ARCHIVE_Q}"`;
  const reject = async (n: number, answer: string): Promise<void> => {
    expect((await p.run("handoff", "ask", "--change", CHANGE, ARCHIVE_Q)).code).toBe(0);
    expect((await p.run("handoff", "resolve", String(n), "--reject", answer)).code).toBe(0);
  };

  test("SCN-LOOP-015-1 a rejected archive question keeps the stop and names the rejection", async () => {
    p.write(".ctx/questions.json", "[]\n");
    await reject(1, "Not yet, review the notes");
    expect(await next()).toMatchObject({ action: "archive", human: true, state: "gate_passed", command: ASK, reason: "archive rejected in question 1: Not yet, review the notes" });
  });

  test("SCN-LOOP-015-5 the highest number decides at the archive stop", async () => {
    // a later approval ends the stop
    expect((await p.run("handoff", "ask", "--change", CHANGE, ARCHIVE_Q)).code).toBe(0);
    expect((await p.run("handoff", "resolve", "2", "--approve", "yes")).code).toBe(0);
    expect(await next()).toMatchObject({ action: "archive", human: false, reason: "archive approved in question 2" });
    // a later rejection wins over the earlier approval
    await reject(3, "Wait for the review");
    expect(await next()).toMatchObject({ action: "archive", human: true, reason: "archive rejected in question 3: Wait for the review" });
  });

  test("SCN-LOOP-016-2 a resolved archive question with no verdict is not an approval", async () => {
    p.write(".ctx/questions.json", JSON.stringify([{ n: 1, asked_at: "2026-10-28", task: CHANGE, text: ARCHIVE_Q, status: "resolved", answer: "yes", resolved_at: "2999-01-01T00:00:00.000Z", stage: "archive" }]) + "\n");
    expect(await next()).toMatchObject({ action: "archive", human: true, command: ASK });
  });
});
