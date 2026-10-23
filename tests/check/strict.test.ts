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

  test("SCN-CHK-002-1 a main REQ with no Covers test is uncovered", async () => {
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

  test("SCN-CHK-003-1 evidence files under .ctx/evidence do not produce findings", async () => {
    p = new Project();
    p.write(".ctx/evidence/001/1.1.json", JSON.stringify({ refs: ["REQ-NOPE-001"], note: "// " + COVERS + "REQ-NOPE-002" }) + "\n");
    const r = await check("--strict");
    expect(r.out).toBe("0 finding(s)\n");
    expect(r.code).toBe(0);
  });
});
