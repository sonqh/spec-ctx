// Covers: REQ-CHK-002, REQ-CHK-003
import { afterEach, describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { COVERS, Project, PARITY_FIXTURE, type Run } from "../helpers.ts";

const SPEC = "openspec/specs/alpha/spec.md";
const TASKS = "openspec/changes/001-x/tasks.md";
let p: Project;
afterEach(() => p?.cleanup());

async function check(...flags: string[]): Promise<Run> {
  await p.build();
  return p.run("check", ...flags);
}

describe("check strict rules", () => {
  test("the clean fixture passes strict", async () => {
    p = new Project();
    expect((await check("--strict")).code).toBe(0);
  });

  test("SCN-CHK-002-1 REQ-XX-003 with no Covers test is uncovered", async () => {
    p = new Project();
    p.append(SPEC, "\n### Requirement: REQ-XX-003 Two letter code\nText.\n\n#### Scenario: SCN-XX-003-1 S\n- a\n");
    p.write("tests/xx.cases.ts", "// SCN-XX-003-1\n");
    const r = await check("--strict");
    expect(r.code).toBe(1);
    expect(r.out).toContain("uncovered  REQ-XX-003");
    p.write("tests/xx.cases.ts", "// " + COVERS + "REQ-XX-003\n// SCN-XX-003-1\n");
    expect((await check("--strict")).code).toBe(0);
  });

  test("SCN-CHK-002-3 a pending removal needs no test", async () => {
    p = new Project();
    p.append(SPEC, "\n### Requirement: REQ-OLD-001 Old\nText.\n\n#### Scenario: SCN-OLD-001-1 S\n- a\n");
    let r = await check("--strict");
    expect(r.out).toContain("uncovered  REQ-OLD-001");
    expect(r.out).toContain("scenario-untested  SCN-OLD-001-1");
    p.write("openspec/changes/009-drop/specs/alpha/spec.md", "## REMOVED Requirements\n\n### Requirement: REQ-OLD-001 Old\n**Reason**: gone.\n");
    r = await check("--strict");
    expect(r.out).not.toContain("REQ-OLD-001");
    expect(r.out).not.toContain("SCN-OLD-001-1");
    expect(r.code).toBe(0);
  });

    test("a capability code has 2 to 6 letters", async () => {
    p = new Project();
    p.append(SPEC, "\n### Requirement: REQ-X-003 One letter\nText.\n\n### Requirement: REQ-ABCDEFG-001 Seven letters\nText.\n");
    const r = await check();
    expect(r.out).toContain("missing-id  REQ-X-003 One letter");
    expect(r.out).toContain("missing-id  REQ-ABCDEFG-001 Seven letters");
  });

  test("a main REQ with no Covers test is uncovered", async () => {
    p = new Project();
    p.write("tests/a.cases.ts", "// " + COVERS + "REQ-AAA-001\n// SCN-AAA-001-1 SCN-AAA-002-1\n");
    expect((await check()).code).toBe(0);
    const r = await check("--strict");
    expect(r.code).toBe(1);
    expect(r.out).toContain("uncovered  REQ-AAA-002");
  });

  test("unknown-task-req only in strict mode", async () => {
    p = new Project();
    p.append(TASKS, "- [ ] 1.3 Do gamma. [REQ-GGG-001] Verify: a test.\n");
    expect((await check()).code).toBe(0);
    expect((await check("--strict")).out).toContain("unknown-task-req  REQ-GGG-001");
  });

  test("scenario-untested until a test names the scenario", async () => {
    p = new Project();
    p.append(SPEC, "\n### Requirement: REQ-AAA-003 Plan\nText.\n\n#### Scenario: SCN-AAA-003-1 Plan\n- a\n");
    p.write("tests/b.cases.ts", "// " + COVERS + "REQ-AAA-003\n");
    expect((await check()).code).toBe(0);
    expect((await check("--strict")).out).toContain("scenario-untested  SCN-AAA-003-1");
    p.write("tests/b.cases.ts", "// " + COVERS + "REQ-AAA-003\nit('SCN-AAA-003-1 plan', () => {});\n");
    expect((await check("--strict")).code).toBe(0);
  });

  test("SCN-CHK-002-2 parity: the strict findings equal the Python golden", async () => {
    p = new Project(PARITY_FIXTURE);
    const r = await check("--strict");
    expect(r.code).toBe(1);
    const golden = readFileSync(new URL("../fixtures/parity-golden/check-strict.out", import.meta.url), "utf8");
    expect(r.out).toBe(golden);
    for (const rule of ["unknown-cap", "reused-id", "dangling-ref", "code-tag-no-canonical", "unknown-task-req", "uncovered", "scenario-untested"]) {
      expect(r.out).toContain(`  ${rule}  `);
    }
  });

  test("SCN-CHK-003-1 evidence that matches the tree adds no finding", async () => {
    p = new Project();
    // the base fixture holds evidence for the ticked task 001/1.1 with the digests of its tagged files
    expect(p.read(".ctx/evidence/001/1.1.json")).toContain('"task": "001/1.1"');
    const r = await check("--strict");
    // the fixture evidence is manual, so strict prints a warning that does not count
    expect(r.out).toBe("warning: manual-evidence 001/1.1\n\n1 finding in 1 file (0 hard, 1 advisory)\nmanual-evidence  1  Give the task a Verify command and run specctx task done again.\n");
    expect(r.code).toBe(0);
  });
});
