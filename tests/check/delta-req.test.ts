// Covers: REQ-CHK-009, SCN-CHK-009-1, SCN-CHK-009-2, SCN-CHK-009-3, SCN-CHK-009-4, SCN-CHK-009-5
import { afterEach, describe, expect, test } from "vitest";
import { Project, COVERS, type Run } from "../helpers.ts";

const DELTA = "openspec/changes/005-new/specs/alpha/spec.md";
const TASKS = "openspec/changes/005-new/tasks.md";
const ADDED = "## ADDED Requirements\n\n### Requirement: REQ-XX-050 New thing\nText.\n\n#### Scenario: SCN-XX-050-1 S\n- a\n";
const MODIFIED = "## MODIFIED Requirements\n\n### Requirement: REQ-XX-050 New thing\nText.\n\n#### Scenario: SCN-XX-050-1 S\n- a\n";
const REMOVED = "## REMOVED Requirements\n\n### Requirement: REQ-XX-050 New thing\n**Reason**: gone\n";
const FINDING = "uncovered  REQ-XX-050";
let p: Project;
afterEach(() => p?.cleanup());

function task(box: string): string {
  return `# Tasks\n\n- [${box}] 1.1 Do it. [REQ-XX-050] Verify: \`bun test\`\n`;
}
async function strict(): Promise<Run> {
  await p.build();
  return p.run("check", "--strict");
}

describe("delta requirement test check", () => {
  test("SCN-CHK-009-1 an open task means no finding", async () => {
    p = new Project();
    p.write(DELTA, ADDED);
    p.write(TASKS, task(" "));
    expect((await strict()).out).not.toContain(FINDING);
  });

  test("SCN-CHK-009-2 all tasks done and no tag is a finding", async () => {
    p = new Project();
    p.write(DELTA, ADDED);
    p.write(TASKS, task("x"));
    expect((await strict()).out).toContain(FINDING);
  });

  test("SCN-CHK-009-3 a tagged requirement is no finding", async () => {
    p = new Project();
    p.write(DELTA, ADDED);
    p.write(TASKS, task("x"));
    p.write("tests/xx50.cases.ts", "// " + COVERS + "REQ-XX-050\n");
    expect((await strict()).out).not.toContain(FINDING);
  });

  test("SCN-CHK-009-4 a MODIFIED requirement with no tag is a finding", async () => {
    p = new Project();
    p.write(DELTA, MODIFIED);
    p.write(TASKS, task("x"));
    expect((await strict()).out).toContain(FINDING);
  });

  test("SCN-CHK-009-5 a pending REMOVED requirement is no finding", async () => {
    p = new Project();
    p.write(DELTA, REMOVED);
    p.write(TASKS, task("x"));
    expect((await strict()).out).not.toContain(FINDING);
  });
});
