// Covers: REQ-CHK-008
import { afterEach, describe, expect, test } from "vitest";
import { Project, COVERS, type Run } from "../helpers.ts";

const DELTA = "openspec/changes/005-new/specs/alpha/spec.md";
const TASKS = "openspec/changes/005-new/tasks.md";
const BODY = "## ADDED Requirements\n\n### Requirement: REQ-XX-050 New thing\nText.\n\n#### Scenario: SCN-XX-050-1 S\n- a\n";
let p: Project;
afterEach(() => p?.cleanup());

function task(box: string): string {
  return `# Tasks\n\n- [${box}] 1.1 Do it. [REQ-XX-050] Verify: \`bun test\`\n`;
}
async function strict(): Promise<Run> {
  await p.build();
  return p.run("check", "--strict");
}

describe("delta scenario test check", () => {
  test("SCN-CHK-008-1 an open task means no finding", async () => {
    p = new Project();
    p.write(DELTA, BODY);
    p.write(TASKS, task(" "));
    const r = await strict();
    expect(r.out).not.toContain("scenario-untested  SCN-XX-050-1");
  });

  test("SCN-CHK-008-2 all tasks done and no test is a finding with the Covers hint", async () => {
    p = new Project();
    p.write(DELTA, BODY);
    p.write(TASKS, task("x"));
    const r = await strict();
    expect(r.out).toContain("scenario-untested  SCN-XX-050-1");
    expect(r.out).toContain("// " + COVERS + "<SCN>");
  });

  test("SCN-CHK-008-3 a tested scenario is no finding", async () => {
    p = new Project();
    p.write(DELTA, BODY);
    p.write(TASKS, task("x"));
    p.write("tests/xx50.cases.ts", "// " + COVERS + "REQ-XX-050\n// SCN-XX-050-1\n");
    const r = await strict();
    expect(r.out).not.toContain("scenario-untested  SCN-XX-050-1");
  });
});
