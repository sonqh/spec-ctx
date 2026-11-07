// Covers: REQ-LOOP-019, SCN-LOOP-019-1, SCN-LOOP-019-2
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { NO_ID_FIXTURE, OPENSPEC_STUB, Project } from "../helpers.ts";

// next refuses the archive while a new capability delta has no Purpose (067/D3). The stub keeps OpenSpec off the network.
let p: Project;
const CHANGE = "add-mfa";
const TASKS = `openspec/changes/${CHANGE}/tasks.md`;
const SPEC = `openspec/changes/${CHANGE}/specs/user-auth/spec.md`;
const NEW = `openspec/changes/${CHANGE}/specs/newcap/spec.md`;
const DELTA = (purpose: string): string => `# newcap\n\n${purpose}## ADDED Requirements\n\n### Requirement: REQ-NC-001 Thing\nThe system SHALL do a thing.\n\n#### Scenario: SCN-NC-001-1 Works\n- **WHEN** a\n- **THEN** b\n`;

async function next(): Promise<Record<string, unknown>> {
  const r = await p.run("next", "--json");
  expect(r.code, r.err).toBe(0);
  return JSON.parse(r.out) as Record<string, unknown>;
}

beforeAll(async () => {
  p = new Project(NO_ID_FIXTURE);
  process.env.SPECCTX_OPENSPEC = OPENSPEC_STUB;
  p.write(SPEC, "# user-auth\n\n## ADDED Requirements\n\n### Requirement: REQ-UA-001 Second factor\nThe system SHALL ask for a TOTP code after a valid password.\n\n#### Scenario: SCN-UA-001-1 Valid code\n- **WHEN** the user enters the current TOTP code\n- **THEN** the system opens a session\n");
  p.write(TASKS, "# Tasks\n\n## 1. Second factor\n\n- [ ] 1.1 Add the TOTP secret store [REQ-UA-001] Verify: `node -e 0`\n");
  p.touchForward(SPEC);
  p.touchForward(TASKS);
  expect((await p.run("task", "start", `${CHANGE}/1.1`)).code).toBe(0);
  expect((await p.run("task", "done", `${CHANGE}/1.1`)).code).toBe(0);
  p.write(".ctx/gate-log.jsonl", JSON.stringify({ at: "2999-01-01T00:00:00.000Z", duration_s: 1, failed_step: null, ok: true, steps: [], strict: true }) + "\n");
});

afterAll(() => {
  delete process.env.SPECCTX_OPENSPEC;
  p?.cleanup();
});

describe("Purpose before archive", () => {
  test("SCN-LOOP-019-1 a delta of a new capability with no Purpose turns the archive into a gate action", async () => {
    p.write(NEW, DELTA(""));
    p.touchForward(NEW);
    const d = await next();
    expect(d).toMatchObject({ action: "gate", human: false, state: "purpose_missing", command: "specctx check --strict" });
    expect(d.reason).toContain(NEW);
    expect(d.reason).toContain("## Purpose");
  });

  test("SCN-LOOP-019-2 a Purpose text lets the archive stop return", async () => {
    p.write(NEW, DELTA("## Purpose\nThe new capability does a thing.\n\n"));
    p.touchForward(NEW, 10000);
    expect(await next()).toMatchObject({ action: "archive", human: true, state: "gate_passed" });
  });

  test("SCN-LOOP-019-2 a baselined delta-without-purpose does not block the archive stop", async () => {
    p.write(NEW, DELTA(""));
    p.touchForward(NEW, 20000);
    expect(await next()).toMatchObject({ action: "gate", state: "purpose_missing" });
    p.write(".ctx/baseline.json", JSON.stringify(["delta-without-purpose newcap"]) + "\n");
    expect(await next()).toMatchObject({ action: "archive", state: "gate_passed" });
  });
});
