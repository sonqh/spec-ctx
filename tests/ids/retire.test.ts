// Covers: REQ-IDS-003
import { afterEach, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

describe("id retire", () => {
  test("SCN-IDS-003-1 retire a removed ID, then check reports it when it comes back", async () => {
    process.env.SPECCTX_NOW = "2026-10-24T08:00:00.000Z";
    try {
      p = new Project();
      const r = await p.run("id", "retire", "REQ-QRY-009", "merged into QRY-003");
      expect(r.code, r.err).toBe(0);
      const text = p.read("decisions/retired-ids.md");
      expect(text).toContain("| ID | Date | Reason |\n| --- | --- | --- |\n");
      expect(text.endsWith("| REQ-QRY-009 | 2026-10-24 | merged into QRY-003 |\n")).toBe(true);
      p.append("openspec/specs/alpha/spec.md", "\n### Requirement: REQ-QRY-009 Back\nText.\n\n#### Scenario: SCN-QRY-009-1 S\n- a\n");
      p.touchForward("openspec/specs/alpha/spec.md");
      const c = await p.run("check");
      expect(c.code).toBe(1);
      expect(c.out).toContain("reused-id  REQ-QRY-009");
    } finally {
      delete process.env.SPECCTX_NOW;
    }
  });

  test("an empty or missing file gets the table", async () => {
    p = new Project();
    p.write("decisions/retired-ids.md", "");
    await p.run("id", "retire", "REQ-QRY-010", "gone");
    expect(p.read("decisions/retired-ids.md")).toMatch(/^# Retired IDs\n\nIDs that were removed\. Never reuse them\.\n\n\| ID \| Date \| Reason \|\n\| --- \| --- \| --- \|\n\| REQ-QRY-010 \| \d{4}-\d{2}-\d{2} \| gone \|\n$/);
    const { rmSync } = await import("node:fs");
    rmSync(p.path("decisions/retired-ids.md"));
    expect((await p.run("id", "retire", "REQ-QRY-011", "a | b")).code).toBe(0);
    expect(p.read("decisions/retired-ids.md")).toContain("| REQ-QRY-011 |");
    expect(p.read("decisions/retired-ids.md")).toContain("a \\| b |");
  });

  test("SCN-IDS-003-2 an ID still in use exits 2 with its file and line", async () => {
    p = new Project();
    const before = p.read("decisions/retired-ids.md");
    const r = await p.run("id", "retire", "REQ-AAA-001", "no longer needed");
    expect(r.code).toBe(2);
    expect(r.err).toContain("openspec/specs/alpha/spec.md:5");
    expect(p.read("decisions/retired-ids.md")).toBe(before);
  });

  test("SCN-IDS-003-3 an ID that lives only in an archived change can be retired", async () => {
    p = new Project();
    p.write("openspec/changes/archive/2026-10-01-000-old/specs/old/spec.md",
      "## ADDED Requirements\n\n### Requirement: REQ-OLD-001 Old\nText.\n\n#### Scenario: SCN-OLD-001-1 S\n- a\n");
    const r = await p.run("id", "retire", "REQ-OLD-001", "moved to another project");
    expect(r.code, r.err).toBe(0);
    expect(p.read("decisions/retired-ids.md")).toContain("| REQ-OLD-001 |");
    expect((await p.run("check")).out).not.toContain("reused-id");
  });

  test("a second retire, a bad ID, and a missing reason exit 2", async () => {
    p = new Project();
    expect((await p.run("id", "retire", "REQ-QRY-012", "x")).code).toBe(0);
    expect((await p.run("id", "retire", "REQ-QRY-012", "x")).code).toBe(2);
    expect((await p.run("id", "retire", "nope", "x")).code).toBe(2);
    expect((await p.run("id", "retire", "REQ-QRY-013")).code).toBe(2);
  });
});
