// Covers: REQ-CHK-006
import { afterEach, describe, expect, test } from "vitest";
import { hintOf } from "../../src/check/hints.ts";
import { checkText } from "../../src/cli/commands.ts";
import { NO_ID_FIXTURE, Project } from "../helpers.ts";

let p: Project | undefined;
afterEach(() => {
  p?.cleanup();
  p = undefined;
});

const DELTA = "openspec/changes/add-mfa/specs/user-auth/spec.md";

describe("a hint per finding", () => {
  test("SCN-CHK-006-1 the retitle hint copies the bare main header and the bracketed delta header", async () => {
    p = new Project(NO_ID_FIXTURE);
    expect((await p.run("init")).code).toBe(0);
    expect((await p.run("adopt")).code).toBe(0);
    expect((await p.run("baseline", "write")).code).toBe(0);
    // main keeps the bare form. Only the delta header turns bracketed with a new title.
    p.write(DELTA, p.read(DELTA).replace("### Requirement: REQ-UA-001 Session timeout", "### Requirement: [REQ-UA-001] Idle timeout"));
    p.touchForward(DELTA);
    const r = await p.run("check");
    expect(r.code).toBe(1);
    expect(r.out).toContain("retitle-needs-renamed  1  Add to the delta before the MODIFIED block:\n## RENAMED Requirements\n- FROM: `### Requirement: REQ-UA-001 Session timeout`\n- TO: `### Requirement: [REQ-UA-001] Idle timeout`\n");
    // SCN-CHK-006-3 the JSON form holds no hint key
    const j = JSON.parse((await p.run("check", "--json")).out) as { findings: Record<string, unknown>[] };
    expect(j.findings.length).toBeGreaterThan(0);
    for (const f of j.findings) expect(f).not.toHaveProperty("hint");
  });

  test("SCN-CHK-006-2 the stale-evidence hint names the why argument", () => {
    expect(hintOf("stale-evidence")).toBe("Run specctx task reopen <task> <why>, then specctx task done <task>.");
    const out = checkText({ findings: [{ file: ".ctx/evidence/002/2.1.json", line: 1, rule: "stale-evidence", id: "002/2.1 src/a.ts" }], warnings: [], baselined: 0 });
    expect(out).toContain("stale-evidence  1  Run specctx task reopen <task> <why>, then specctx task done <task>.\n");
  });

  test("SCN-CHK-006-3 a rule without a finding hint prints the table hint, and two distinct hints print both", () => {
    const f = (rule: string, id: string, hint?: string) => ({ file: "a.md", line: 1, rule, id, ...(hint ? { hint } : {}) });
    const out = checkText({ findings: [f("uncovered", "REQ-AAA-001"), f("retitle-needs-renamed", "REQ-A", "one"), f("retitle-needs-renamed", "REQ-B", "two"), f("retitle-needs-renamed", "REQ-C", "one")], warnings: [], baselined: 0 });
    expect(out).toContain(`uncovered  1  ${hintOf("uncovered")}\n`);
    expect(out).toContain("retitle-needs-renamed  3  one\ntwo\n");
  });
});

// Covers: REQ-CHK-007
describe("dangling-ref hint", () => {
  // The literal is built at run time, so the scan of this repository reads no tag in this file.
  const LITERAL = "const s = '" + "// REQ-" + "NOPE-001';\n";

  test("SCN-CHK-007-1 the hint names the cause and the fix", async () => {
    p = new Project();
    p.write("src/lit.ts", LITERAL);
    const r = await p.run("check");
    expect(r.code).toBe(1);
    const line = r.out.split("\n").find((l) => l.startsWith("dangling-ref  "))!;
    for (const s of ["string literal", "fixture text", "run time", "[scan] ignore"]) expect(line, s).toContain(s);
  });

  test("SCN-CHK-007-2 the scan still reads a tag inside a string", async () => {
    p = new Project();
    p.write("src/lit.ts", LITERAL);
    const r = await p.run("check");
    expect(r.out).toContain("src/lit.ts:1  dangling-ref  REQ-NOPE-001");
  });
});
