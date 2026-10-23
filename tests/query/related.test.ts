// Covers: REQ-QRY-002
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Project, PARITY_FIXTURE } from "../helpers.ts";

const REASONS = ["scenario of", "ref from", "ref to", "decision for", "task cites", "implements", "covers"];
let p: Project;
let base: Project;
beforeAll(async () => {
  p = new Project(PARITY_FIXTURE);
  base = new Project();
  base.write("openspec/specs/apply-pipeline/spec.md",
    "### Requirement: REQ-APPLY-007 Revert\nText.\n\n#### Scenario: SCN-APPLY-007-9 Full\n- a\n");
  base.write("openspec/changes/archive/2026-10-24-002-core/specs/apply-pipeline/spec.md",
    "## ADDED Requirements\n\n### Requirement: REQ-APPLY-007 Revert\nText.\n\n#### Scenario: SCN-APPLY-007-9 Full\n- a\n");
});
afterAll(() => {
  p.cleanup();
  base.cleanup();
});
const lines = async (pr: Project, ...args: string[]) => {
  const r = await pr.run(...args);
  expect(r.code, r.err).toBe(0);
  return r.out.trimEnd().split("\n").filter(Boolean);
};

describe("related", () => {
  test("SCN-QRY-002-1 every line has a reason and the scenario says scenario of", async () => {
    const ls = await lines(p, "related", "REQ-APPLY-005");
    expect(ls.length).toBeGreaterThan(3);
    for (const l of ls) {
      const [, , , , reason] = l.split("  ");
      expect(REASONS.some((r) => reason!.startsWith(r)), l).toBe(true);
    }
    const scn = ls.find((l) => l.split("  ")[1] === "SCN-APPLY-005-1")!;
    expect(scn.endsWith("scenario of REQ-APPLY-005")).toBe(true);
  });

  test("each reason kind on the base fixture", async () => {
    const ls = await lines(base, "related", "REQ-AAA-001");
    expect(ls).toContain("adr  ADR-001  active  decisions/ADR-001-sample.md:1  ref from REQ-AAA-001");
    expect(ls).toContain("code  src/a.ts:1  active  src/a.ts:1  implements REQ-AAA-001");
    expect(ls.some((l) => l.startsWith("test  ") && l.endsWith("covers REQ-AAA-001"))).toBe(true);
    expect(ls.some((l) => l.startsWith("task  001/1.1") && l.endsWith("task cites REQ-AAA-001"))).toBe(true);
    expect(ls.some((l) => l.startsWith("req  REQ-AAA-002") && l.endsWith("ref to REQ-AAA-001"))).toBe(true);
    expect((await lines(base, "related", "REQ-AAA-002")).some((l) => l.includes("001/D1") && l.endsWith("decision for REQ-AAA-002"))).toBe(true);
  });

  test("depth 0 lists the scenarios only and depth 2 reaches further", async () => {
    expect(await lines(base, "related", "REQ-AAA-001", "--depth", "0")).toEqual([
      "scn  SCN-AAA-001-1  active  openspec/specs/alpha/spec.md:10  scenario of REQ-AAA-001",
    ]);
    const d1 = await lines(base, "related", "REQ-AAA-002");
    const d2 = await lines(base, "related", "REQ-AAA-002", "--depth", "2");
    expect(d2.length).toBeGreaterThan(d1.length);
  });

  test("--all shows every copy and an unknown ID exits 2", async () => {
    const ls = await lines(base, "related", "SCN-APPLY-007-9", "--all");
    expect(ls.filter((l) => l.includes("  REQ-APPLY-007  "))).toHaveLength(2);
    expect((await base.run("related", "REQ-ZZZ-001")).code).toBe(2);
  });
});
