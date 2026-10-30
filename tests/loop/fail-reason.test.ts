// Covers: REQ-LOOP-006, REQ-LOOP-001
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { chmodSync } from "node:fs";
import { capQuestion, failLine } from "../../src/loop/fails.ts";
import { NO_ID_FIXTURE, Project } from "../helpers.ts";

// The fix reason of 029/D3. One run through task done and next, then the line rule on its own.

let p: Project;
const CHANGE = "add-mfa";
const TASKS = `openspec/changes/${CHANGE}/tasks.md`;
const SPEC = `openspec/changes/${CHANGE}/specs/user-auth/spec.md`;

beforeAll(() => {
  p = new Project(NO_ID_FIXTURE);
  const os = p.path("osstub/openspec");
  p.write("osstub/openspec", `#!/bin/sh\necho '${JSON.stringify({ isPlanningComplete: true, nextSteps: [] })}'\n`);
  chmodSync(os, 0o755);
  process.env.SPECCTX_OPENSPEC = os;
  p.write("fail.sh", "printf '$ bun test\\nfail: one\\nok\\n FAIL two\\n1 fail\\n' >&2\nexit 1\n");
  p.write(SPEC, "# user-auth\n\n## ADDED Requirements\n\n### Requirement: REQ-UA-001 Second factor\nThe system SHALL ask for a TOTP code after a valid password.\n\n#### Scenario: SCN-UA-001-1 Valid code\n- **WHEN** the user enters the current TOTP code\n- **THEN** the system opens a session\n");
  p.write(TASKS, "# Tasks\n\n## 1. Second factor\n\n- [ ] 1.1 Add the TOTP secret store [REQ-UA-001] Verify: `sh fail.sh`\n");
  p.touchForward(SPEC);
  p.touchForward(TASKS);
});

afterAll(() => {
  delete process.env.SPECCTX_OPENSPEC;
  p?.cleanup();
});

describe("the fix reason", () => {
  test("SCN-LOOP-006-1 next names the last fail line of the tail", async () => {
    expect((await p.run("task", "start", `${CHANGE}/1.1`)).code).toBe(0);
    expect((await p.run("task", "done", `${CHANGE}/1.1`)).code).toBe(1);
    const r = await p.run("next", "--json");
    expect(r.code, r.err).toBe(0);
    expect(JSON.parse(r.out)).toMatchObject({ action: "fix", attempt: 1, reason: "Verify failed (exit 1): FAIL two", task: `${CHANGE}/1.1` });
  });

  test("SCN-LOOP-006-1 the line rule: fail: or FAIL after leading spaces, case sensitive", () => {
    expect(failLine("$ bun test\nfail: one\nok\n FAIL two\n1 fail\n")).toBe("FAIL two");
    expect(failLine("fail: only\nFailed later\n")).toBe("fail: only");
    expect(failLine(" FAIL  tests/x.test.ts > adds\n")).toBe("FAIL  tests/x.test.ts > adds");
  });

  test("SCN-LOOP-006-2 with no fail line the reason is the last non-empty line", () => {
    expect(failLine("first\nlast\n\n")).toBe("last");
    expect(failLine("first\n  last  \n   \n")).toBe("last");
  });

  test("SCN-LOOP-006-3 an empty tail gives no output", () => {
    expect(failLine("")).toBe("no output");
    expect(failLine("   \n \n")).toBe("no output");
  });

  test("SCN-LOOP-006-4 a bun test failure tail names the (fail) line", () => {
    const tail = [
      "$ bun test tests/x.test.ts",
      "bun test v1.3.0 (abc123)",
      "",
      "tests/x.test.ts:",
      "error: expect(received).toBe(expected)",
      "",
      "Expected: 2",
      "Received: 3",
      "",
      "(fail) adds [0.12ms]",
      "",
      " 27 pass",
      " 1 fail",
      " 28 expect() calls",
      "Ran 28 tests across 4 files. [30.00ms]",
      "",
    ].join("\n");
    expect(failLine(tail)).toBe("(fail) adds [0.12ms]");
    expect(capQuestion("039/1.1", 3, tail)).toBe("task 039/1.1 failed Verify 3 times. Last: (fail) adds [0.12ms]. What should change?");
  });

  test("SCN-LOOP-006-5 the last line of any of the three prefixes wins, after trimming", () => {
    expect(failLine("FAIL one\n  (fail) two\nfail: three\nok\n")).toBe("fail: three");
    expect(failLine("fail: one\nFAIL two\n  (fail) three  \nok\n")).toBe("(fail) three");
    expect(failLine("a (fail) b\nlast\n")).toBe("last");
  });
});
