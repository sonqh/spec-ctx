// Covers: REQ-QRY-010, REQ-QRY-011
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

let p: Project;
beforeAll(() => {
  p = new Project(null);
  p.write("openspec/specs/thing/spec.md", "### Requirement: REQ-TH-001 Thing\nThe thing SHALL work.\n");
  p.write("openspec/changes/009-add-x/proposal.md", "# Proposal\n");
  p.write("openspec/changes/009-add-x/specs/thing/spec.md",
    "## MODIFIED Requirements\n\n### Requirement: REQ-TH-001 Thing\nThe thing SHALL work well.\n\n## ADDED Requirements\n\n### Requirement: REQ-TH-003 More\nMore SHALL work.\n");
  p.write("openspec/changes/009-add-x/tasks.md", "# Tasks\n\n- [ ] 1.1 Build. [REQ-TH-003] Verify: `true`\n");
});
afterAll(() => p.cleanup());

describe("change as a start", () => {
  test("SCN-QRY-011-1 related by key and by folder name", async () => {
    const a = await p.run("related", "009");
    const b = await p.run("related", "009-add-x");
    expect(a.code, a.err).toBe(0);
    expect(b.out).toBe(a.out);
    const rows = a.out.split("\n").filter(Boolean);
    expect(rows).toContain("cap  cap/thing  active  openspec/specs/thing/spec.md:1  capability touched by change/009");
    expect(rows.some((l) => l.includes("  REQ-TH-003  ") && l.endsWith("delta in change/009"))).toBe(true);
    expect((await p.run("related", "change/009")).out).toBe(a.out);
  });

  test("bundle takes a change and prints its capability line", async () => {
    const r = await p.run("bundle", "009");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("-- REQ-TH-003 |");
    expect(r.out).toContain("-- cap/thing | openspec/specs/thing/spec.md:1 | active | capability touched by change/009\n");
    expect(r.out.startsWith("-- change/009 | openspec/changes/009-add-x/proposal.md:1 | active | requested\n")).toBe(true);
  });

  test("a change wins over a path", async () => {
    p.write("009", "plain file\n");
    const r = await p.run("related", "009");
    expect(r.out).toContain("capability touched by change/009");
  });

  test("an unknown change or capability keeps unknown id", async () => {
    for (const id of ["change/999", "cap/nothing"]) {
      const r = await p.run("related", id);
      expect(r.code).toBe(2);
      expect(r.err).toContain(`unknown id ${id}`);
    }
    const b = await p.run("bundle", "cap/nothing");
    expect(b.code).toBe(2);
    expect(b.err).toContain("unknown id(s): cap/nothing");
  });
});

describe("main version row", () => {
  test("related prints the main spec copy of a modified requirement", async () => {
    const r = await p.run("related", "change/009");
    const rows = r.out.split("\n").filter((l) => l.includes("  REQ-TH-001  "));
    expect(rows).toEqual([
      "req  REQ-TH-001  modified  openspec/changes/009-add-x/specs/thing/spec.md:3  delta in change/009",
      "req  REQ-TH-001  active  openspec/specs/thing/spec.md:1  main version of REQ-TH-001",
    ]);
    const j = JSON.parse((await p.run("related", "change/009", "--json")).out) as { id: string; file: string; reason: string }[];
    expect(j.filter((e) => e.id === "REQ-TH-001").map((e) => e.file)).toEqual(["openspec/changes/009-add-x/specs/thing/spec.md", "openspec/specs/thing/spec.md"]);
  });

  test("a modified requirement as the start lists its main version first", async () => {
    const r = await p.run("related", "REQ-TH-001");
    expect(r.out.split("\n")[0]).toBe("req  REQ-TH-001  active  openspec/specs/thing/spec.md:1  main version of REQ-TH-001");
  });

  test("--all lists each copy once", async () => {
    const r = await p.run("related", "change/009", "--all");
    expect(r.out.split("\n").filter((l) => l.includes("  REQ-TH-001  "))).toHaveLength(2);
  });
});
