// Covers: REQ-CHK-010, SCN-CHK-010-1, SCN-CHK-010-2, SCN-CHK-010-3, SCN-CHK-010-4, SCN-CHK-010-5, SCN-CHK-010-6, SCN-CHK-010-7, SCN-CHK-010-8, REQ-CHK-004
import { afterEach, describe, expect, test } from "vitest";
import { Project, COVERS, type Run } from "../helpers.ts";

const DELTA = "openspec/changes/005-new/specs/alpha/spec.md";
const TASKS = "openspec/changes/005-new/tasks.md";
const ADDED = "## ADDED Requirements\n\n### Requirement: REQ-XX-050 New thing\nText.\n\n#### Scenario: SCN-XX-050-1 S\n- a\n";
// the base fixture change 001-x also defers, so every case looks for the line of 005-new alone
const LINE = /^deferred: 005-new {2}\d+ untested delta items?, \d+ open tasks?$/m;
const ANY = /^deferred: /m;
let p: Project;
afterEach(() => p?.cleanup());

function task(box: string): string {
  return `# Tasks\n\n- [${box}] 1.1 Do it. [REQ-XX-050] Verify: \`bun test\`\n`;
}
async function strict(...extra: string[]): Promise<Run> {
  await p.build();
  return p.run("check", "--strict", ...extra);
}

describe("deferred notice", () => {
  test("SCN-CHK-010-1 an open task and an untested delta item print the line, and the exit code stays", async () => {
    p = new Project();
    p.write(DELTA, ADDED);
    p.write(TASKS, task(" "));
    const r = await strict();
    expect(r.out).toMatch(/^deferred: 005-new {2}2 untested delta items, 1 open task$/m);
    expect(r.code).toBe(0);
    // the line adds nothing else: without it the output is the advisory of the base fixture alone
    expect(r.out.replace(/^deferred: .*\n/gm, "")).toBe("warning: manual-evidence 001/1.1\n\n1 finding in 1 file (0 hard, 1 advisory)\nmanual-evidence  1  Give the task a Verify command and run specctx task done again.\n");
  });

  test("SCN-CHK-010-2 a change with all tasks done prints no line", async () => {
    p = new Project();
    p.write(DELTA, ADDED);
    p.write(TASKS, task("x"));
    expect((await strict()).out).not.toMatch(LINE);
  });

  test("SCN-CHK-010-3 an open task with every delta item tested prints no line", async () => {
    p = new Project();
    p.write(DELTA, ADDED);
    p.write(TASKS, task(" "));
    p.write("tests/xx50.cases.ts", "// " + COVERS + "REQ-XX-050, SCN-XX-050-1\n");
    expect((await strict()).out).not.toMatch(LINE);
  });

  test("SCN-CHK-010-4 the JSON holds a deferred array with change, untested, and open", async () => {
    p = new Project();
    p.write(DELTA, ADDED);
    p.write(TASKS, task(" "));
    await p.build();
    const j = JSON.parse((await p.run("check", "--strict", "--json")).out);
    expect(j.deferred).toContainEqual({ change: "005-new", untested: 2, open: 1 });
    expect(Object.keys(j.deferred[0]).sort()).toEqual(["change", "open", "untested"]);
    const plain = JSON.parse((await p.run("check", "--json")).out);
    expect(plain).not.toHaveProperty("deferred");
    // with every task of every change done, the array is empty and still there
    p.write(TASKS, task("x"));
    p.write("openspec/changes/001-x/tasks.md", p.read("openspec/changes/001-x/tasks.md").replace("- [ ]", "- [x]"));
    await p.build();
    const none = JSON.parse((await p.run("check", "--strict", "--json")).out);
    expect(none.deferred).toEqual([]);
  });

  test("SCN-CHK-010-5 the deferred lines come before the baselined line", async () => {
    p = new Project();
    p.append("openspec/specs/alpha/spec.md", "\n### Requirement: REQ-AAA-003 A\nText.\n\n#### Scenario: SCN-AAA-003-1 S\n- a\n");
    p.write(".ctx/baseline.json", JSON.stringify(["scenario-untested SCN-AAA-003-1", "uncovered REQ-AAA-003"]) + "\n");
    p.write(DELTA, ADDED);
    p.write(TASKS, task(" "));
    const r = await strict();
    const lines = r.out.trimEnd().split("\n");
    expect(lines[lines.length - 1]).toMatch(/^baselined: \d+$/);
    const at = lines.findIndex((l) => LINE.test(l));
    expect(at).toBeGreaterThan(lines.findIndex((l) => l.startsWith("manual-evidence  ")));
    expect(at).toBeLessThan(lines.length - 1);
  });

  test("SCN-CHK-010-6 a failing gate prints no deferred line", async () => {
    p = new Project();
    p.append("openspec/specs/alpha/spec.md", "\nRefs: REQ-NOPE-001\n");
    p.write(DELTA, ADDED);
    p.write(TASKS, task(" "));
    // check alone shows the line for this project, so the gate output proves that the gate leaves it out
    expect((await strict()).out).toMatch(LINE);
    process.env.SPECCTX_OPENSPEC = "/bin/false";
    try {
      const g = await p.run("gate", "--strict");
      expect(g.code).toBe(1);
      expect(g.out.startsWith("check: fail\n")).toBe(true);
      expect(g.out).not.toMatch(ANY);
    } finally {
      delete process.env.SPECCTX_OPENSPEC;
    }
  });

  test("SCN-CHK-010-7 a change with a delta and no task prints the line with 0 open tasks", async () => {
    p = new Project();
    p.write(DELTA, ADDED);
    const r = await strict();
    expect(r.out).toMatch(/^deferred: 005-new {2}2 untested delta items, 0 open tasks$/m);
    expect(r.code).toBe(0);
  });

  test("SCN-CHK-010-8 a count of 1 is singular", async () => {
    p = new Project();
    p.write(DELTA, ADDED);
    p.write(TASKS, task(" "));
    // the tag names the scenario and not the requirement, so one item stays untested
    p.write("tests/xx50.cases.ts", "// " + COVERS + "SCN-XX-050-1\n");
    const r = await strict();
    expect(r.out).toMatch(/^deferred: 005-new {2}1 untested delta item, 1 open task$/m);
  });

  test("REQ-CHK-004 the summary and rule lines come before the deferred lines", async () => {
    p = new Project();
    p.append("openspec/specs/alpha/spec.md", "\nRefs: REQ-NOPE-001\n");
    p.write(DELTA, ADDED);
    p.write(TASKS, task(" "));
    const r = await strict();
    expect(r.code).toBe(1);
    expect(r.out.indexOf("dangling-ref  1")).toBeGreaterThan(r.out.indexOf("1 finding in"));
    expect(r.out.indexOf("deferred: 005-new")).toBeGreaterThan(r.out.indexOf("dangling-ref  1"));
  });
});
