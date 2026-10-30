// Covers: REQ-IDX-007, SCN-IDX-007-1, SCN-IDX-007-2, SCN-IDX-007-3
import { afterEach, describe, expect, test } from "vitest";
import { COVERS, Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const SPEC = (ids: string[]): string => "## ADDED Requirements\n\n" + ids.map((id) => `### Requirement: ${id} Thing\nText.\n\n#### Scenario: ${id.replace("REQ", "SCN")}-1 Case\n- a\n`).join("\n");

/** The REQ IDs that the index records as covered by test lines, sorted. */
async function covered(testBody: string): Promise<string[]> {
  p?.cleanup();
  p = new Project(null);
  p.write("openspec/specs/ab/spec.md", SPEC(["REQ-AB-001"]));
  p.write("tests/a.test.ts", testBody);
  const idx = await p.build();
  return idx.entries.filter((e: any) => e.kind === "test").flatMap((e: any) => e.refs as string[]).sort();
}

describe("the Covers tag reads the whole line", () => {
  test("SCN-IDX-007-1 mixed SCN and REQ IDs with commas, spaces, and a semicolon", async () => {
    const ids = await covered(`// ${COVERS}SCN-AB-001-1, REQ-AB-001 REQ-AB-002; REQ-AB-003\n`);
    expect(ids).toEqual(["REQ-AB-001", "REQ-AB-002", "REQ-AB-003"]);
  });

  test("SCN-IDX-007-1 a plain comma list and a repeated ID", async () => {
    expect(await covered(`// ${COVERS}REQ-AB-001, REQ-AB-002, REQ-AB-001\n`)).toEqual(["REQ-AB-001", "REQ-AB-002"]);
  });

  test("SCN-IDX-007-1 a space list and a semicolon list", async () => {
    expect(await covered(`// ${COVERS}REQ-AB-001 REQ-AB-002\n// ${COVERS}REQ-AB-003;REQ-AB-004\n`)).toEqual(["REQ-AB-001", "REQ-AB-002", "REQ-AB-003", "REQ-AB-004"]);
  });

  test("SCN-IDX-007-2 an SCN ID first leaves the REQ ID covered, so strict check has no uncovered finding", async () => {
    p = new Project(null);
    p.write("openspec/specs/ab/spec.md", SPEC(["REQ-AB-001"]));
    p.write("tests/a.test.ts", `// ${COVERS}SCN-AB-001-1, REQ-AB-001\n`);
    const idx = await p.build();
    expect(idx.entries.filter((e: any) => e.kind === "test").map((e: any) => e.refs)).toEqual([["REQ-AB-001"]]);
    const r = await p.run("check", "--strict");
    expect(r.out + r.err).not.toContain("uncovered");
  });

  test("SCN-IDX-007-3 a four digit suffix does not match the three digit ID", async () => {
    expect(await covered(`// ${COVERS}REQ-AB-0011\n`)).toEqual([]);
    expect(await covered(`// ${COVERS}REQ-AB-0011, REQ-AB-002\n`)).toEqual(["REQ-AB-002"]);
  });

  test("a Covers line with only SCN IDs adds no REQ and no code entry", async () => {
    p = new Project(null);
    p.write("openspec/specs/ab/spec.md", SPEC(["REQ-AB-001"]));
    p.write("tests/a.test.ts", `// ${COVERS}SCN-AB-001-1\n`);
    const idx = await p.build();
    expect(idx.entries.filter((e: any) => e.kind === "test" || e.kind === "code")).toEqual([]);
  });
});
