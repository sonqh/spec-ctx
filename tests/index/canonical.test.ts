// Covers: REQ-IDX-003
import { afterEach, describe, expect, test } from "vitest";
import { cpSync, rmSync } from "node:fs";
import { Project, PARITY_FIXTURE } from "../helpers.ts";

const APPLY = `# apply

## Requirements

### Requirement: REQ-APPLY-007 Revert
Main text of revert.

#### Scenario: SCN-APPLY-007-9 Full revert
- **WHEN** revert runs
- **THEN** the home is empty
`;
const BODY = APPLY.split("## Requirements\n\n")[1]!;

let p: Project;
afterEach(() => p?.cleanup());
const of = (idx: any, id: string) => idx.entries.filter((e: any) => e.id === id);

describe("canonical", () => {
  test("SCN-IDX-003-1 main wins over archive", async () => {
    p = new Project();
    p.write("openspec/specs/apply-pipeline/spec.md", APPLY);
    p.write("openspec/changes/archive/2026-10-24-002-core/specs/apply-pipeline/spec.md", "## ADDED Requirements\n\n" + BODY);
    const es = of(await p.build(), "REQ-APPLY-007");
    expect(es).toHaveLength(2);
    expect(es.filter((e: any) => e.canonical).map((e: any) => e.file)).toEqual(["openspec/specs/apply-pipeline/spec.md"]);
  });

  test("SCN-IDX-003-2 a MODIFIED block in an active change wins over main", async () => {
    p = new Project();
    p.write("openspec/specs/apply-pipeline/spec.md", APPLY);
    p.write("openspec/changes/005-ux/specs/apply-pipeline/spec.md", "## MODIFIED Requirements\n\n" + BODY.replace("Main text", "New text"));
    const canon = of(await p.build(), "REQ-APPLY-007").filter((e: any) => e.canonical);
    expect(canon).toHaveLength(1);
    expect(canon[0].file).toBe("openspec/changes/005-ux/specs/apply-pipeline/spec.md");
    expect(canon[0].status).toBe("modified");
    expect((await p.run("bundle", "REQ-APPLY-007")).out).toContain("New text");
  });

  test("a REMOVED block is never canonical", async () => {
    p = new Project();
    p.write("openspec/changes/005-ux/specs/alpha/spec.md", "## REMOVED Requirements\n\n### Requirement: REQ-AAA-002 Lockfile reader\n**Reason**: merged.\n");
    const es = of(await p.build(), "REQ-AAA-002");
    expect(es.find((e: any) => e.status === "removed").canonical).toBe(false);
    expect(es.filter((e: any) => e.canonical).map((e: any) => e.file)).toEqual(["openspec/specs/alpha/spec.md"]);
  });

  test("decisions are canonical in the change that holds them", async () => {
    p = new Project();
    const d = of(await p.build(), "001/D1");
    expect(d).toHaveLength(1);
    expect(d[0].canonical).toBe(true);
    expect(d[0].change).toBe("001-x");
  });

  test("SCN-IDX-003-3 canonical REQ count equals distinct REQ IDs on the parity fixture", async () => {
    p = new Project(null);
    rmSync(p.root, { recursive: true });
    cpSync(PARITY_FIXTURE, p.root, { recursive: true });
    const idx = await p.build();
    const reqs = idx.entries.filter((e: any) => e.kind === "req");
    const canon = reqs.filter((e: any) => e.canonical).map((e: any) => e.id);
    const removedOnly = new Set(reqs.map((e: any) => e.id));
    for (const e of reqs) if (e.status !== "removed") removedOnly.delete(e.id);
    expect(new Set(canon).size).toBe(canon.length);
    expect(canon.length).toBe(new Set(reqs.map((e: any) => e.id)).size - removedOnly.size);
    expect(canon.length).toBeGreaterThan(100);
  });
});
