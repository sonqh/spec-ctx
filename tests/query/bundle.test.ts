// Covers: REQ-QRY-003
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { Project, PARITY_FIXTURE } from "../helpers.ts";

const MAIN = `# apply

## Requirements

### Requirement: REQ-APPLY-001 Plan is read-only
Main text of plan.

#### Scenario: SCN-APPLY-001-9 No writes
- **WHEN** plan runs
- **THEN** nothing is written

### Requirement: REQ-APPLY-007 Revert
\`revert\` SHALL restore the latest backup set.

#### Scenario: SCN-APPLY-007-9 Full revert
- **WHEN** revert runs
- **THEN** the home is empty
`;

let p: Project;
let par: Project;
beforeAll(async () => {
  p = new Project();
  p.write("openspec/specs/apply-pipeline/spec.md", MAIN);
  p.write("openspec/changes/archive/2026-10-24-002-core/specs/apply-pipeline/spec.md",
    "# apply\n\n## ADDED Requirements\n\n" + MAIN.split("## Requirements\n\n")[1]!.replace("Main text", "Archived text"));
  await p.build();
  par = new Project(PARITY_FIXTURE);
});
afterAll(() => {
  p.cleanup();
  par.cleanup();
});
const bundle = async (pr: Project, ...args: string[]) => {
  const r = await pr.run("bundle", ...args);
  expect(r.code, r.err).toBe(0);
  return r.out;
};

describe("bundle", () => {
  test("SCN-QRY-003-1 output is at most the budget plus the trailer", async () => {
    for (const [pr, id] of [[par, "REQ-APPLY-001"], [p, "REQ-AAA-001"]] as const) {
      const out = await bundle(pr, id, "--budget", "2000");
      const ls = out.trimEnd().split("\n");
      const m = /^truncated: (\d+) entries omitted: (.+)$/.exec(ls[ls.length - 1]!);
      if (pr === par) expect(m).not.toBeNull();
      const body = m ? out.slice(0, out.lastIndexOf("truncated:")) : out;
      expect([...body].length).toBeLessThanOrEqual(2000);
      if (m) expect(m[2]!.split(", ")).toHaveLength(Number(m[1]));
    }
  });

  test("SCN-QRY-003-2 code entries print file:line only, in the fixed order", async () => {
    const out = await bundle(p, "REQ-AAA-001", "--budget", "100000");
    expect(out).not.toContain("export const a");
    expect(out).toContain("-- src/a.ts:1 | src/a.ts:1 | active | implements REQ-AAA-001\n");
    const marks = ["-- REQ-AAA-001 |", "# ADR-001", "-- REQ-AAA-002 |", "-- 001/1.1 |", "-- src/a.ts:1 |", "-- tests/a.cases.ts:1 |"];
    const pos = marks.map((s) => out.indexOf(s));
    expect(pos.every((x) => x >= 0)).toBe(true);
    expect(pos).toEqual([...pos].sort((a, b) => a - b));
    expect(out).toContain("#### Scenario: SCN-AAA-001-1");
    expect(out).not.toContain("truncated:");
  });

  test("SCN-QRY-003-3 the bundle prints the main text, not the archive copy", async () => {
    const out = await bundle(p, "REQ-APPLY-001");
    expect(out).toContain("Main text");
    expect(out).not.toContain("Archived text");
    expect(await bundle(p, "REQ-APPLY-001", "--all")).toContain("Archived text");
  });

  test("SCN-QRY-003-4 parity: the output equals the Python golden", async () => {
    // the golden comes from the Python engine, recorded by tests/parity/run.sh --record
    const golden = readFileSync(new URL("../fixtures/parity-golden/bundle.out", import.meta.url), "utf8");
    expect(await bundle(par, "REQ-APPLY-001", "--budget", "3000")).toBe(golden);
  });

  test("provenance lines and decisions", async () => {
    const first = (await bundle(p, "REQ-APPLY-001")).split("\n")[0]!;
    expect(first.startsWith("-- REQ-APPLY-001 | openspec/specs/apply-pipeline/spec.md:")).toBe(true);
    expect(first.endsWith("requested")).toBe(true);
    for (const l of (await bundle(p, "REQ-AAA-001")).split("\n")) {
      if (l.startsWith("-- ")) expect(l).toMatch(/^-- \S+ \| \S+:\d+ \| \w+ \| .+$/);
    }
    p.write("decisions/ADR-002-other.md", "# ADR-002 Other\n\nStatus: accepted.\n");
    p.write("openspec/specs/apply-pipeline/spec.md", MAIN.replace("restore the latest backup set.\n", "restore the latest backup set.\n\nRefs: ADR-002\n"));
    p.write("openspec/changes/005-ux/design.md", "# Design\n\n## Decisions\n\n- `revert` prints one drift line. Refs: REQ-APPLY-007.\n");
    p.write("openspec/changes/005-ux/tasks.md", "# Tasks\n\n- [ ] 5.2 Revert line. [REQ-APPLY-007] Verify: a test.\n");
    const d0 = await bundle(p, "REQ-APPLY-007", "--depth", "0");
    expect(d0).toContain("-- 005/D1 | openspec/changes/005-ux/design.md:5 | active | decision for REQ-APPLY-007\n- `revert` prints one drift line.");
    const out = await bundle(p, "REQ-APPLY-007");
    expect(out.indexOf("# ADR-002")).toBeLessThan(out.indexOf("-- 005/D1"));
    expect(out.indexOf("-- 005/D1")).toBeLessThan(out.indexOf("-- 005/5.2"));
  });

  test("an unknown ID exits 2", async () => {
    const r = await p.run("bundle", "REQ-NOPE-001");
    expect(r.code).toBe(2);
    expect(r.err).toContain("unknown id(s): REQ-NOPE-001");
  });
});
