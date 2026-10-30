// Covers: REQ-LOOP-011, SCN-LOOP-011-3
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { chmodSync } from "node:fs";
import { NO_ID_FIXTURE, Project } from "../helpers.ts";

// Every task is done with evidence. Only a strict passing gate line moves next to archive. OpenSpec is a local stub.
let p: Project;
const CHANGE = "add-mfa";
const TASKS = `openspec/changes/${CHANGE}/tasks.md`;
const SPEC = `openspec/changes/${CHANGE}/specs/user-auth/spec.md`;
const AT = "2999-01-01T00:00:00.000Z";
const line = (extra: Record<string, unknown>): string => JSON.stringify({ at: AT, duration_s: 1, failed_step: null, ok: true, steps: ["check"], ...extra }) + "\n";

async function action(): Promise<string> {
  const r = await p.run("next", "--json");
  expect(r.code, r.err).toBe(0);
  return (JSON.parse(r.out) as { action: string }).action;
}

beforeAll(async () => {
  delete process.env.SPECCTX_RERUN;
  p = new Project(NO_ID_FIXTURE);
  p.write("osstub/openspec", `#!/bin/sh\necho '${JSON.stringify({ isPlanningComplete: true, nextSteps: [] })}'\n`);
  chmodSync(p.path("osstub/openspec"), 0o755);
  process.env.SPECCTX_OPENSPEC = p.path("osstub/openspec");
  p.write(SPEC, "# user-auth\n\n## ADDED Requirements\n\n### Requirement: REQ-UA-001 Second factor\nThe system SHALL ask for a TOTP code after a valid password.\n\n#### Scenario: SCN-UA-001-1 Valid code\n- **WHEN** the user enters the current TOTP code\n- **THEN** the system opens a session\n");
  p.write(TASKS, "# Tasks\n\n## 1. Second factor\n\n- [ ] 1.1 Add the TOTP secret store [REQ-UA-001] Verify: `node -e 0`\n");
  p.touchForward(SPEC);
  p.touchForward(TASKS);
  p.write(".ctx/questions.json", JSON.stringify([{ n: 1, asked_at: "2026-10-28", task: CHANGE, text: "plan?", status: "resolved", answer: "y", resolved_at: "2026-10-28", stage: "plan", verdict: "approved" }]) + "\n");
  expect((await p.run("task", "start", `${CHANGE}/1.1`)).code).toBe(0);
  expect((await p.run("task", "done", `${CHANGE}/1.1`)).code).toBe(0);
});

afterAll(() => {
  delete process.env.SPECCTX_OPENSPEC;
  p?.cleanup();
});

describe("only a strict gate line counts", () => {
  test("SCN-LOOP-011-3 a passing non-strict gate after the evidence keeps action gate", async () => {
    p.write(".ctx/gate-log.jsonl", line({ strict: false }));
    expect(await action()).toBe("gate");
  });

  test("SCN-LOOP-011-3 a passing line without the strict key does not count", async () => {
    p.write(".ctx/gate-log.jsonl", line({}));
    expect(await action()).toBe("gate");
  });

  test("SCN-LOOP-011-3 a later non-strict pass hides an earlier strict pass", async () => {
    p.write(".ctx/gate-log.jsonl", line({ strict: true }) + line({ strict: false }));
    expect(await action()).toBe("gate");
  });

  test("SCN-LOOP-011-3 a passing strict line moves next to archive", async () => {
    p.write(".ctx/gate-log.jsonl", line({ strict: true }));
    expect(await action()).toBe("archive");
  });
});
