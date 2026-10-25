// Covers: REQ-ADOPT-005, REQ-CHK-002
import { afterEach, describe, expect, test } from "vitest";
import { COVERS, NO_ID_FIXTURE, Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

async function adopted(): Promise<Project> {
  const pr = new Project(NO_ID_FIXTURE);
  expect((await pr.run("adopt")).code).toBe(0);
  expect((await pr.run("task", "backfill", "--manual", "adopted")).code).toBe(0);
  return pr;
}

describe("baseline", () => {
  test("SCN-ADOPT-005-1 day one strict passes after baseline write", async () => {
    p = await adopted();
    expect((await p.run("check", "--strict")).code).toBe(1);
    const w = await p.run("baseline", "write");
    expect(w.code).toBe(0);
    const list = JSON.parse(p.read(".ctx/baseline.json")) as string[];
    expect(list).toEqual([...list].sort());
    for (const id of ["REQ-UA-001", "REQ-UA-002", "REQ-UA-003", "REQ-PS-001", "REQ-PS-002"]) expect(list).toContain(`uncovered ${id}`);
    expect(list).toContain("task-without-req add-mfa/1.1");
    expect(list).toContain("task-without-verify add-mfa/1.3");
    expect(list).toContain("manual-evidence add-mfa/1.1");
    const r = await p.run("check", "--strict");
    expect(r.code, r.out).toBe(0);
    expect(r.out).toBe(`0 finding(s)\nbaselined: ${list.length}\n`);
    // the filter applies to plain check too
    const plain = await p.run("check");
    expect(plain.code).toBe(0);
    expect(plain.out).toMatch(/^0 finding\(s\)\nbaselined: \d+\n$/);
  });

  test("SCN-ADOPT-005-2 new debt is visible", async () => {
    p = await adopted();
    await p.run("baseline", "write");
    p.append("openspec/specs/profile-schema/spec.md", "\n### Requirement: REQ-PS-003 Version field\nThe profile SHALL hold a version.\n\n#### Scenario: SCN-PS-003-1 No version\n- **WHEN** a\n- **THEN** b\n");
    p.touchForward("openspec/specs/profile-schema/spec.md");
    const r = await p.run("check", "--strict");
    expect(r.code).toBe(1);
    const lines = r.out.split("\n").filter((l) => / {2}(uncovered|scenario-untested) {2}/.test(l));
    expect(lines).toEqual([
      "openspec/specs/profile-schema/spec.md:22  uncovered  REQ-PS-003",
      "openspec/specs/profile-schema/spec.md:25  scenario-untested  SCN-PS-003-1",
    ]);
  });

  test("SCN-ADOPT-005-3 prune drops an entry that no longer fires", async () => {
    p = await adopted();
    await p.run("baseline", "write");
    const before = JSON.parse(p.read(".ctx/baseline.json")) as string[];
    p.write("tests/ps.cases.ts", `// ${COVERS}REQ-PS-001\n`);
    const r = await p.run("baseline", "prune");
    expect(r.out).toBe("pruned 1\n");
    const after = JSON.parse(p.read(".ctx/baseline.json")) as string[];
    expect(before.filter((e) => !after.includes(e))).toEqual(["uncovered REQ-PS-001"]);
    expect((await p.run("baseline", "prune")).out).toBe("pruned 0\n");
  });

  test("SCN-CHK-002-4 three baselined entries that still fire are counted", async () => {
    p = new Project();
    p.append("openspec/specs/alpha/spec.md", "\n### Requirement: REQ-AAA-003 A\nText.\n\n#### Scenario: SCN-AAA-003-1 S\n- a\n");
    p.write(".ctx/baseline.json", JSON.stringify(["scenario-untested SCN-AAA-003-1", "uncovered REQ-AAA-003", "uncovered REQ-AAA-009"]) + "\n");
    p.append("openspec/changes/001-x/tasks.md", "- [ ] 1.3 Legacy task\n");
    p.write(".ctx/baseline.json", JSON.stringify(["scenario-untested SCN-AAA-003-1", "task-without-req 001/1.3", "task-without-verify 001/1.3", "uncovered REQ-AAA-003"]) + "\n");
    const r = await p.run("check", "--strict");
    expect(r.code, r.out).toBe(0);
    expect(r.out.endsWith("baselined: 4\n")).toBe(true);
    p.write(".ctx/baseline.json", JSON.stringify(["scenario-untested SCN-AAA-003-1", "task-without-req 001/1.3", "uncovered REQ-AAA-003"]) + "\n");
    const r3 = await p.run("check", "--strict");
    expect(r3.out).toContain("task-without-verify  001/1.3");
    expect(r3.out.endsWith("1 finding(s)\nbaselined: 3\n")).toBe(true);
    const j = JSON.parse((await p.run("check", "--strict", "--json")).out);
    expect(j.baselined).toBe(3);
  });

  test("other rules never enter the baseline", async () => {
    p = new Project();
    p.append("openspec/specs/alpha/spec.md", "\nRefs: REQ-NOPE-001\n");
    await p.run("baseline", "write");
    // the base fixture holds manual evidence for 001/1.1. The dangling ref stays out.
    expect(JSON.parse(p.read(".ctx/baseline.json"))).toEqual(["manual-evidence 001/1.1"]);
    expect((await p.run("check")).code).toBe(1);
  });
});
