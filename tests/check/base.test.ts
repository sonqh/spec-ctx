// Covers: REQ-CHK-001, REQ-GOV-002
import { afterEach, describe, expect, test } from "vitest";
import { Project, TAG, type Run } from "../helpers.ts";

const SPEC = "openspec/specs/alpha/spec.md";
const TASKS = "openspec/changes/001-x/tasks.md";
let p: Project;
afterEach(() => p?.cleanup());

async function check(...flags: string[]): Promise<Run> {
  await p.build();
  return p.run("check", ...flags);
}
function finding(r: Run, rule: string, id: string): void {
  expect(r.code, r.out).toBe(1);
  expect(r.out).toMatch(new RegExp(`\\S+:\\d+  ${rule}  ${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
}

describe("check base rules", () => {
  test("a clean fixture passes", async () => {
    p = new Project();
    const r = await check();
    expect(r.code, r.out).toBe(0);
    expect(r.out).toBe("0 finding(s)\n");
  });

  test("SCN-CHK-001-1 dangling ref", async () => {
    p = new Project();
    p.append(SPEC, "\nRefs: REQ-NOPE-001\n");
    const r = await check();
    finding(r, "dangling-ref", "REQ-NOPE-001");
    expect(r.out).toContain(SPEC + ":");
  });

  test("SCN-CHK-001-2 a MODIFIED block is not a duplicate", async () => {
    p = new Project();
    p.write("openspec/changes/005-ux/specs/alpha/spec.md",
      "## MODIFIED Requirements\n\n### Requirement: REQ-AAA-001 Lockfile writer\nNew text.\n\n#### Scenario: SCN-AAA-001-1 Write\n- a\n");
    const r = await check();
    expect(r.out).not.toContain("duplicate-id");
    expect(r.code, r.out).toBe(0);
  });

  test("SCN-CHK-001-3 unknown capability code", async () => {
    p = new Project();
    p.write("spec-ctx.toml", '[ids]\ncaps = ["AAA", "BBB"]\n');
    expect((await check()).code).toBe(0);
    p.append(SPEC, "\n### Requirement: REQ-ZZZ-001 Odd\nText.\n\n#### Scenario: SCN-ZZZ-001-1 S\n- a\n");
    finding(await check(), "unknown-cap", "REQ-ZZZ-001");
  });

  test("duplicate-id, req-without-scn, missing-id", async () => {
    p = new Project();
    p.append(SPEC, "\n### Requirement: REQ-AAA-001 Again\nText.\n\n#### Scenario: SCN-AAA-001-9 X\n- a\n");
    finding(await check(), "duplicate-id", "REQ-AAA-001");
    p = new Project();
    p.append(SPEC, "\n### Requirement: REQ-AAA-003 Lonely\nText.\n");
    finding(await check(), "req-without-scn", "REQ-AAA-003");
    p = new Project();
    p.append(SPEC, "\n### Requirement: Profile location\nText.\n");
    finding(await check(), "missing-id", "Profile location");
  });

  test("scenario-id-mismatch and bad-ref", async () => {
    p = new Project();
    p.append(SPEC, "\n### Requirement: REQ-AAA-003 X\nText.\n\nRefs: nope\n\n#### Scenario: SCN-AAA-004-1 Y\n- a\n");
    const r = await check();
    finding(r, "scenario-id-mismatch", "SCN-AAA-004-1 under REQ-AAA-003");
    finding(r, "bad-ref", "nope");
  });

  test("task-without-req and task-without-verify", async () => {
    p = new Project();
    p.append(TASKS, "- [ ] 1.3 Add zod\n");
    const r = await check();
    finding(r, "task-without-req", "001/1.3");
    finding(r, "task-without-verify", "001/1.3");
  });

  test("SCN-GOV-002-1 a retired ID that reappears", async () => {
    p = new Project();
    p.append("decisions/retired-ids.md", "\n| REQ-QRY-009 | 2026-10-24 | merged |\n");
    p.append(SPEC, "\n### Requirement: REQ-QRY-009 Back\nText.\n\n#### Scenario: SCN-QRY-009-1 S\n- a\n");
    finding(await check(), "reused-id", "REQ-QRY-009");
  });

  test("SCN-CHK-001-4 a replacement ID named in a retire reason stays live", async () => {
    p = new Project();
    p.append("openspec/specs/alpha/spec.md", "\n### Requirement: REQ-CLI-001 Commands\nText.\n\n#### Scenario: SCN-CLI-001-1 S\n- a\n");
    p.append("decisions/retired-ids.md", "\n| ID | Date | Reason |\n| --- | --- | --- |\n| REQ-CTX-008 | 2026-10-24 | moved to spec-ctx REQ-CLI-001 |\n| REQ-OLD-001 | 2026-10-24 | moved to REQ-AAA-001 |\n");
    const r = await check();
    expect(r.out).not.toContain("reused-id");
    expect(r.code).toBe(0);
  });

  test("SCN-CHK-001-5 an archived REMOVED block without scenarios is no finding", async () => {
    p = new Project();
    p.write("openspec/changes/archive/2026-10-01-000-old/specs/alpha/spec.md", "## REMOVED Requirements\n\n### Requirement: REQ-OLD-002 Gone\n**Reason**: moved.\n");
    expect((await check()).out).not.toContain("req-without-scn");
  });

  test("reused-id fires for a non-archived copy and not for an archived one", async () => {
    p = new Project();
    p.append("decisions/retired-ids.md", "\n| REQ-OLD-003 | 2026-10-24 | gone |\n");
    p.write("openspec/changes/archive/2026-10-01-000-old/specs/old/spec.md", "## ADDED Requirements\n\n### Requirement: REQ-OLD-003 Old\nText.\n\n#### Scenario: SCN-OLD-003-1 S\n- a\n");
    expect((await check()).out).not.toContain("reused-id");
    p.write("openspec/changes/005-ux/specs/old/spec.md", "## MODIFIED Requirements\n\n### Requirement: REQ-OLD-003 Old\nNew.\n\n#### Scenario: SCN-OLD-003-1 S\n- a\n");
    finding(await check(), "reused-id", "REQ-OLD-003");
  });

  test("code-tag-no-canonical for a tag whose REQ lives only in an archive", async () => {
    p = new Project();
    p.write("openspec/changes/archive/2026-10-23-000-old/specs/old/spec.md",
      "## ADDED Requirements\n\n### Requirement: REQ-OLD-001 Old\nText.\n\n#### Scenario: SCN-OLD-001-1 Old\n- a\n");
    p.write("src/x.ts", TAG + "OLD-001\nexport const x = 1;\n");
    const r = await check();
    expect(r.out).toContain("src/x.ts:1  code-tag-no-canonical  REQ-OLD-001");
    p.write("src/x.ts", TAG + "AAA-001\n");
    expect((await check()).code).toBe(0);
  });

  test("an archived copy of a main spec is not a duplicate", async () => {
    p = new Project();
    p.write("openspec/changes/archive/2026-10-23-000-old/specs/alpha/spec.md", p.read(SPEC));
    expect((await check()).code).toBe(0);
  });

  test("--json prints one document", async () => {
    p = new Project();
    p.append(SPEC, "\nRefs: REQ-NOPE-001\n");
    await p.build();
    const r = await p.run("check", "--json");
    expect(r.code).toBe(1);
    const doc = JSON.parse(r.out);
    expect(doc.count).toBe(1);
    expect(doc.findings[0]).toMatchObject({ file: SPEC, rule: "dangling-ref", id: "REQ-NOPE-001" });
  });
});
