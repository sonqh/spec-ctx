// Covers: REQ-QRY-009, REQ-QRY-010, REQ-QRY-011
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

const MAIN = [
  "# Thing", "",
  "### Requirement: REQ-TH-001 Thing", "The thing SHALL work.", "",
  "#### Scenario: SCN-TH-001-1 Works", "- **WHEN** a", "- **THEN** b", "",
  "### Requirement: REQ-TH-002 Sibling", "The sibling SHALL work.", "",
  "#### Scenario: SCN-TH-002-1 Sibling works", "- **WHEN** a", "- **THEN** b", "",
].join("\n");
const DELTA = [
  "## MODIFIED Requirements", "",
  "### Requirement: REQ-TH-001 Thing", "The thing SHALL work well.", "",
  "#### Scenario: SCN-TH-001-1 Works", "- **WHEN** a", "- **THEN** b", "",
  "## ADDED Requirements", "",
  "### Requirement: REQ-TH-003 More", "More SHALL work.", "",
  "#### Scenario: SCN-TH-003-1 More works", "- **WHEN** c", "- **THEN** d", "",
].join("\n");
const ARCHIVED_DELTA = [
  "## ADDED Requirements", "",
  "### Requirement: REQ-TH-002 Sibling", "The sibling SHALL work.", "",
  "#### Scenario: SCN-TH-002-1 Sibling works", "- **WHEN** a", "- **THEN** b", "",
].join("\n");
const DESIGN = "# Design\n\n## Decisions\n\n- D1 First. Refs: REQ-TH-001\n- D2 Second. Refs: REQ-TH-001\n- D3 Third. Refs: REQ-TH-003\n";

let p: Project;
beforeAll(() => {
  p = new Project(null);
  p.write("openspec/specs/thing/spec.md", MAIN);
  p.write("openspec/changes/009-add-x/proposal.md", "# Proposal\n");
  p.write("openspec/changes/009-add-x/design.md", DESIGN);
  p.write("openspec/changes/009-add-x/specs/thing/spec.md", DELTA);
  p.write("openspec/changes/009-add-x/tasks.md", "# Tasks\n\n- [ ] 1.1 Build per D3. [REQ-TH-002] Verify: `true`\n");
  p.write("openspec/changes/archive/2026-01-02-008-old/design.md", DESIGN);
  p.write("openspec/changes/archive/2026-01-02-008-old/specs/thing/spec.md", ARCHIVED_DELTA);
  p.write("openspec/changes/archive/2026-01-02-008-old/tasks.md", "# Tasks\n\n- [x] 1.1 Done. [REQ-TH-001] Verify: `true`\n");
});
afterAll(() => p.cleanup());

/** id to the list of "file reason" strings of a related run. */
async function rel(...args: string[]): Promise<Map<string, string[]>> {
  const r = await p.run("related", ...args);
  expect(r.code, r.err).toBe(0);
  const m = new Map<string, string[]>();
  for (const l of r.out.split("\n").filter(Boolean)) {
    const [, id, , file, reason] = l.split("  ");
    m.set(id!, [...(m.get(id!) ?? []), `${file} ${reason}`]);
  }
  return m;
}

describe("task edges", () => {
  test("SCN-QRY-009-1 task to deltas and decisions", async () => {
    const m = await rel("009/1.1");
    expect(m.get("REQ-TH-001")![0]).toContain("delta in change of 009/1.1");
    expect(m.get("REQ-TH-003")![0]).toContain("delta in change of 009/1.1");
    expect(m.get("SCN-TH-003-1")![0]).toContain("delta in change of 009/1.1");
    expect(m.get("009/D3")![0]).toContain("design named in 009/1.1");
    // the cited requirement keeps its more specific reason
    expect(m.get("REQ-TH-002")![0]).toContain("ref from 009/1.1");
  });

  test("SCN-QRY-009-2 one way only", async () => {
    const m = await rel("REQ-TH-001");
    expect([...m.keys()].filter((i) => /^\d+\/\d/.test(i))).toEqual(["008/1.1"]);
    expect(m.get("008/1.1")![0]).toContain("task cites REQ-TH-001");
    const d = await rel("009/D3");
    expect(d.get("009/1.1")![0]).toContain("task names 009/D3");
  });

  test("SCN-QRY-009-3 archived change", async () => {
    const m = await rel("008/1.1");
    expect(m.get("REQ-TH-002")![0]).toBe("openspec/specs/thing/spec.md:10 delta in change of 008/1.1");
  });
});

describe("capability edges", () => {
  test("SCN-QRY-010-1 requirement and capability", async () => {
    const r = await rel("REQ-TH-001");
    expect(r.get("cap/thing")![0]).toContain("capability of REQ-TH-001");
    const c = await rel("cap/thing");
    for (const id of ["REQ-TH-001", "REQ-TH-002", "REQ-TH-003"]) expect(c.get(id)![0]).toContain("requirement in cap/thing");
  });

  test("SCN-QRY-010-2 main version", async () => {
    const r = await p.run("bundle", "REQ-TH-001");
    expect(r.code, r.err).toBe(0);
    const heads = r.out.split("\n").filter((l) => l.startsWith("-- REQ-TH-001 |"));
    expect(heads).toEqual([
      "-- REQ-TH-001 | openspec/changes/009-add-x/specs/thing/spec.md:3 | modified | requested",
      "-- REQ-TH-001 | openspec/specs/thing/spec.md:3 | active | main version of REQ-TH-001",
    ]);
    expect(r.out).toContain("The thing SHALL work well.");
    expect(r.out).toContain("The thing SHALL work.\n");
    const m = await rel("REQ-TH-003");
    expect(m.has("REQ-TH-001")).toBe(false);
  });

  test("--all lists the main version once", async () => {
    const r = await p.run("bundle", "REQ-TH-001", "--all");
    expect(r.out.split("\n").filter((l) => l.startsWith("-- REQ-TH-001 |"))).toHaveLength(2);
    const rr = await p.run("related", "REQ-TH-003", "--all");
    expect(rr.out.split("\n").filter((l) => l.includes("  REQ-TH-001  "))).toHaveLength(0);
  });

  test("a related run lists the main version of a modified requirement", async () => {
    const r = await p.run("related", "009/1.1");
    const rows = r.out.split("\n").filter((l) => l.includes("  REQ-TH-001  "));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("delta in change of 009/1.1");
    expect(rows[1]).toContain("main version of REQ-TH-001");
  });

  test("SCN-QRY-010-3 no siblings at depth 2", async () => {
    const m = await rel("REQ-TH-001", "--depth", "2");
    expect(m.has("cap/thing")).toBe(true);
    expect(m.has("REQ-TH-002")).toBe(false);
    expect(m.has("REQ-TH-003")).toBe(false);
  });
});

describe("change as a start", () => {
  test("a change entry reaches its deltas and capabilities", async () => {
    const m = await rel("change/009");
    expect(m.get("REQ-TH-001")![0]).toContain("delta in change/009");
    expect(m.get("REQ-TH-003")![0]).toContain("delta in change/009");
    expect(m.get("cap/thing")![0]).toContain("capability touched by change/009");
    expect(m.has("009/1.1")).toBe(false);
  });
});
