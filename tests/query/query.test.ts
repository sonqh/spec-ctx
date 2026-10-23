// Covers: REQ-QRY-001
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Project, PARITY_FIXTURE } from "../helpers.ts";

let p: Project;
let base: Project;
beforeAll(async () => {
  p = new Project(PARITY_FIXTURE);
  await p.build();
  base = new Project();
  base.write("openspec/specs/apply-pipeline/spec.md",
    "# apply\n\n## Requirements\n\n### Requirement: REQ-APPLY-007 Revert\n`revert` SHALL restore.\n\n#### Scenario: SCN-APPLY-007-9 Full\n- a\n\n" +
    "### Requirement: REQ-APPLY-005 Lockfile status\nA revert keeps the lockfile.\n\n#### Scenario: SCN-APPLY-005-9 Drift\n- a\n");
  base.write("openspec/changes/archive/2026-10-24-002-core/specs/apply-pipeline/spec.md",
    "## ADDED Requirements\n\n### Requirement: REQ-APPLY-007 Revert\n`revert` SHALL restore.\n\n#### Scenario: SCN-APPLY-007-9 Full\n- a\n");
  await base.build();
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

describe("query", () => {
  test("SCN-QRY-001-1 every hit of push main holds both terms", async () => {
    const r = await p.run("query", "push", "main", "--json");
    const hits = JSON.parse(r.out);
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) {
      const blob = [h.id, h.title, h.text].join(" ").toLowerCase();
      expect(blob).toContain("push");
      expect(blob).toContain("main");
    }
    const ids = (await lines(p, "query", "push", "main", "--limit", "0")).map((l) => l.split("  ")[0]);
    expect(ids).toContain("REQ-ZZZ-001");
  });

  test("SCN-QRY-001-2 no duplicates without --all", async () => {
    const ids = (await lines(p, "query", "revert", "--limit", "0")).map((l) => l.split("  ")[0]);
    expect(new Set(ids).size).toBe(ids.length);
    const dup = (await lines(base, "query", "revert")).filter((l) => l.startsWith("REQ-APPLY-007 "));
    expect(dup).toHaveLength(1);
    expect(dup[0]).toContain("openspec/specs/apply-pipeline/spec.md:");
    const every = (await lines(base, "query", "revert", "--all")).filter((l) => l.startsWith("REQ-APPLY-007 "));
    expect(every).toHaveLength(2);
    expect(every.some((l) => l.includes("  archived  "))).toBe(true);
  });

  test("SCN-QRY-001-3 an ID match ranks first", async () => {
    expect((await lines(p, "query", "APPLY-007"))[0]!.split("  ")[0]).toBe("REQ-APPLY-007");
    expect((await lines(base, "query", "revert", "--kind", "req")).map((l) => l.split("  ")[0])).toEqual(["REQ-APPLY-007", "REQ-APPLY-005"]);
  });

  test("line shape, no truncation, limit, and filters", async () => {
    expect(await lines(base, "query", "lockfile", "--kind", "req")).toContain("REQ-AAA-001  req  active  openspec/specs/alpha/spec.md:5  Lockfile writer");
    const long = "Do alpha with a very long body " + "and more words ".repeat(12) + "[REQ-AAA-001] Verify: the long check.";
    base.append("openspec/changes/001-x/tasks.md", `- [ ] 1.3 ${long}\n`);
    base.touchForward("openspec/changes/001-x/tasks.md");
    expect((await lines(base, "query", "long", "body"))[0]!.endsWith("Verify: the long check.")).toBe(true);
    expect(await lines(base, "query", "a", "--limit", "2")).toHaveLength(2);
    expect((await lines(p, "query", "a"))).toHaveLength(20);
    expect((await base.run("query", "beta", "--change", "001-x", "--kind", "req")).out.split("  ")[0]).toBe("REQ-BBB-001");
  });

  test("query needs a term", async () => {
    expect((await p.run("query")).code).toBe(2);
  });
});
