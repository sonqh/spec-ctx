// Covers: REQ-IDS-001, REQ-IDS-002
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

const IDX = `# index

## Requirements

### Requirement: REQ-IDX-001 One
Text.

#### Scenario: SCN-IDX-001-1 S
- a

### Requirement: REQ-IDX-004 Four
Text.

#### Scenario: SCN-IDX-004-1 S
- a

#### Scenario: SCN-IDX-004-2 S
- a

#### Scenario: SCN-IDX-004-3 S
- a
`;

let p: Project;
beforeEach(() => {
  p = new Project();
  p.write("spec-ctx.toml", '[ids]\ncaps = ["AAA", "BBB", "IDX", "TASK"]\n');
  p.write("openspec/specs/index/spec.md", IDX);
});
afterEach(() => p.cleanup());

describe("id new", () => {
  test("SCN-IDS-001-1 next requirement skips a retired number", async () => {
    p.append("decisions/retired-ids.md", "\n| ID | Date | Reason |\n| --- | --- | --- |\n| REQ-IDX-006 | 2026-10-24 | merged |\n");
    const r = await p.run("id", "new", "REQ", "IDX");
    expect(r).toMatchObject({ code: 0, out: "REQ-IDX-007\n" });
  });

  test("archived entries count toward the next number", async () => {
    p.write("openspec/changes/archive/2026-10-01-000-old/specs/index/spec.md",
      "## ADDED Requirements\n\n### Requirement: REQ-IDX-009 Old\nText.\n\n#### Scenario: SCN-IDX-009-1 S\n- a\n");
    expect((await p.run("id", "new", "REQ", "IDX")).out).toBe("REQ-IDX-010\n");
  });

  test("SCN-IDS-001-2 next scenario under a requirement", async () => {
    expect((await p.run("id", "new", "SCN", "IDX", "--for", "REQ-IDX-004")).out).toBe("SCN-IDX-004-4\n");
    expect((await p.run("id", "new", "SCN", "IDX", "--for", "REQ-IDX-001", "--count", "2")).out).toBe("SCN-IDX-001-2\nSCN-IDX-001-3\n");
    expect((await p.run("id", "new", "SCN", "IDX")).code).toBe(2);
    expect((await p.run("id", "new", "SCN", "IDX", "--for", "REQ-AAA-001")).code).toBe(2);
  });

  test("SCN-IDS-001-3 an unknown code exits 2 and names the configured codes", async () => {
    const r = await p.run("id", "new", "REQ", "ZZZ");
    expect(r.code).toBe(2);
    expect(r.err).toContain("unknown-cap ZZZ");
    expect(r.err).toContain("AAA, BBB, IDX, TASK");
    expect(r.err.trim().endsWith('Add "ZZZ" to caps under [ids] in spec-ctx.toml.')).toBe(true);
  });

  test("SCN-IDS-001-4 an empty caps list accepts any code", async () => {
    const q = new Project(null);
    try {
      q.write("openspec/specs/a/spec.md", "# a\n");
      q.write("spec-ctx.toml", "[ids]\ncaps = []\n");
      const r = await q.run("id", "new", "REQ", "UA");
      expect(r.code, r.err).toBe(0);
      expect(r.out).toBe("REQ-UA-001\n");
      expect((await q.run("id", "new", "REQ", "U1")).code).toBe(2);
      // the default config of init has an empty list too
      q.write("spec-ctx.toml", (await import("../../src/config.ts")).INIT_TEXT);
      expect((await q.run("id", "new", "REQ", "PS")).out).toBe("REQ-PS-001\n");
    } finally {
      q.cleanup();
    }
  });

  test("SCN-IDS-002-1 reserve three IDs for a new code", async () => {
    expect((await p.run("id", "new", "REQ", "TASK", "--count", "3")).out).toBe("REQ-TASK-001\nREQ-TASK-002\nREQ-TASK-003\n");
    const j = await p.run("id", "new", "REQ", "TASK", "--count", "3", "--json");
    expect(JSON.parse(j.out)).toEqual(["REQ-TASK-001", "REQ-TASK-002", "REQ-TASK-003"]);
    expect(JSON.parse((await p.run("id", "new", "REQ", "TASK", "--json")).out)).toEqual(["REQ-TASK-001"]);
    expect((await p.run("id", "new", "REQ", "TASK", "--count", "0")).code).toBe(2);
  });

  test("ADR and DEC numbers", async () => {
    expect((await p.run("id", "new", "ADR")).out).toBe("ADR-002\n");
    // the base fixture change 001-x has two decisions
    expect((await p.run("id", "new", "DEC", "001-x")).out).toBe("001/D3\n");
    expect((await p.run("id", "new", "DEC", "001")).out).toBe("001/D3\n");
    expect((await p.run("id", "new", "DEC", "042")).code).toBe(2);
    expect((await p.run("id", "new", "XYZ", "IDX")).code).toBe(2);
    expect((await p.run("id")).code).toBe(2);
  });
});
