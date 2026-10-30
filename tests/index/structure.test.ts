// Covers: REQ-IDX-010, REQ-IDX-012, REQ-IDX-013
import { afterEach, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

let p: Project | undefined;
afterEach(() => {
  p?.cleanup();
  p = undefined;
});

const MAIN = "# Thing\n\n### Requirement: REQ-TH-001 Thing\nThe thing SHALL work.\n\n#### Scenario: SCN-TH-001-1 Works\n- **WHEN** a\n- **THEN** b\n";
const DELTA = "## MODIFIED Requirements\n\n### Requirement: REQ-TH-001 Thing\nThe thing SHALL work well.\n\n#### Scenario: SCN-TH-001-1 Works\n- **WHEN** a\n- **THEN** b\n\n## ADDED Requirements\n\n### Requirement: REQ-TH-002 More\nMore SHALL work.\n\n#### Scenario: SCN-TH-002-1 More works\n- **WHEN** c\n- **THEN** d\n";
const DESIGN = "# Design\n\n## Decisions\n\n- D1 First. Refs: REQ-TH-001\n- D2 Second. Refs: REQ-TH-001\n- D3 Third. Refs: REQ-TH-002\n";

function tasks(body: string): string {
  return `# Tasks\n\n## 1. Work\n\n- [ ] 1.1 ${body} [REQ-TH-001] Verify: \`true\`\n`;
}

const byId = (idx: any, id: string): any[] => idx.entries.filter((e: any) => e.id === id);

describe("change and capability entries", () => {
  test("SCN-IDX-010-1 change entry", async () => {
    p = new Project(null);
    p.write("openspec/specs/thing/spec.md", MAIN);
    p.write("openspec/changes/009-add-x/proposal.md", "# Proposal\n");
    p.write("openspec/changes/009-add-x/specs/thing/spec.md", DELTA);
    const idx = await p.build();
    const ch = byId(idx, "change/009");
    expect(ch).toHaveLength(1);
    expect(ch[0].kind).toBe("change");
    expect(ch[0].file).toBe("openspec/changes/009-add-x/proposal.md");
    expect(ch[0].canonical).toBe(true);
    expect(ch[0].change).toBe("009-add-x");
    const links = idx.entries.flatMap((e: any) => e.links ?? []);
    expect(links.filter((l: string) => /^(delta|cap|main):/.test(l))).toEqual([]);
    expect((await p.run("check")).code).toBe(0);
  });

  test("SCN-IDX-010-2 capability entry", async () => {
    p = new Project(null);
    p.write("openspec/specs/thing/spec.md", MAIN);
    p.write("openspec/changes/009-add-x/specs/thing/spec.md", DELTA);
    const first = await p.build();
    const cap = byId(first, "cap/thing");
    expect(cap).toHaveLength(1);
    expect(cap[0].kind).toBe("cap");
    expect(cap[0].file).toBe("openspec/specs/thing/spec.md");
    const text = p.read(".ctx/index.json");
    await p.build();
    expect(p.read(".ctx/index.json")).toBe(text);
  });

  test("a capability that only a delta holds takes the delta file", async () => {
    p = new Project(null);
    p.write("openspec/changes/009-add-x/specs/fresh/spec.md", "## ADDED Requirements\n\n### Requirement: REQ-FR-001 Fresh\nFresh SHALL work.\n");
    const idx = await p.build();
    expect(byId(idx, "cap/fresh")[0].file).toBe("openspec/changes/009-add-x/specs/fresh/spec.md");
  });
});

describe("one change entry per key", () => {
  test("SCN-IDX-013-1 active wins", async () => {
    p = new Project(null);
    p.write("openspec/changes/009-add-x/proposal.md", "# P\n");
    p.write("openspec/changes/archive/2026-01-02-009-old/proposal.md", "# P\n");
    const idx = await p.build();
    const ch = byId(idx, "change/009");
    expect(ch).toHaveLength(1);
    expect(ch[0].file).toBe("openspec/changes/009-add-x/proposal.md");
    expect(ch[0].status).toBe("active");
  });

  test("SCN-IDX-013-2 newest archive wins", async () => {
    p = new Project(null);
    p.write("openspec/changes/archive/2026-01-02-009-old/proposal.md", "# P\n");
    p.write("openspec/changes/archive/2026-03-04-009-new/proposal.md", "# P\n");
    const idx = await p.build();
    const ch = byId(idx, "change/009");
    expect(ch).toHaveLength(1);
    expect(ch[0].file).toBe("openspec/changes/archive/2026-03-04-009-new/proposal.md");
    expect(ch[0].status).toBe("archived");
  });

  test("two active folders with one key give the smaller name", async () => {
    p = new Project(null);
    p.write("openspec/changes/009-b/proposal.md", "# P\n");
    p.write("openspec/changes/009-a/proposal.md", "# P\n");
    const idx = await p.build();
    expect(byId(idx, "change/009").map((e: any) => e.change)).toEqual(["009-a"]);
  });

  test("two archived folders with one date give the smaller name", async () => {
    p = new Project(null);
    p.write("openspec/changes/archive/2026-01-02-009-b/proposal.md", "# P\n");
    p.write("openspec/changes/archive/2026-01-02-009-a/proposal.md", "# P\n");
    const idx = await p.build();
    expect(byId(idx, "change/009").map((e: any) => e.change)).toEqual(["009-a"]);
  });

  test("a folder name that is the key gives one entry", async () => {
    p = new Project(null);
    p.write("openspec/changes/add-mfa/proposal.md", "# P\n");
    p.write("openspec/changes/archive/2026-01-02-add-mfa/proposal.md", "# P\n");
    const idx = await p.build();
    expect(byId(idx, "change/add-mfa")).toHaveLength(1);
    expect(byId(idx, "change/add-mfa")[0].status).toBe("active");
  });
});

describe("design links", () => {
  function project(body: string): Project {
    const q = new Project(null);
    q.write("openspec/specs/thing/spec.md", MAIN);
    q.write("openspec/changes/008-old/design.md", DESIGN);
    q.write("openspec/changes/009-add-x/design.md", DESIGN);
    q.write("openspec/changes/009-add-x/specs/thing/spec.md", DELTA);
    q.write("openspec/changes/009-add-x/tasks.md", tasks(body));
    return q;
  }

  test("SCN-IDX-012-1 full and bare names", async () => {
    p = project("Write `src/D1.ts` per 008/D2 and D3.");
    const idx = await p.build();
    expect(byId(idx, "009/1.1")[0].links).toEqual(["design:008/D2", "design:009/D3"]);
  });

  test("a folder name resolves to the key", async () => {
    p = project("Per 008-old/D1.");
    const idx = await p.build();
    expect(byId(idx, "009/1.1")[0].links).toEqual(["design:008/D1"]);
  });

  test("SCN-IDX-012-2 no such decision", async () => {
    p = project("Per D9 and 007/D1 and 009/D9.");
    const idx = await p.build();
    expect(byId(idx, "009/1.1")[0].links).toBeUndefined();
  });

  test("a bare D after a letter, digit, slash, or hyphen makes no link", async () => {
    p = project("Read AD1, 3D2, x-D3, a/D1.");
    const idx = await p.build();
    expect(byId(idx, "009/1.1")[0].links).toBeUndefined();
  });
});
