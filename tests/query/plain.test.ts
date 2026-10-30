// Covers: REQ-QRY-013
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

let p: Project;
beforeAll(() => {
  p = new Project(null);
  p.write("openspec/specs/thing/spec.md", "### Requirement: REQ-TH-001 Thing\nThe thing SHALL work.\n");
  p.write("openspec/changes/009-thing/proposal.md", "# Proposal\n");
  p.write("openspec/changes/009-thing/specs/thing/spec.md", "## ADDED Requirements\n\n### Requirement: REQ-TH-002 Thing too\nIt SHALL work.\n");
});
afterAll(() => p.cleanup());

const ids = (out: string): string[] => out.split("\n").filter(Boolean).map((l) => l.split(/\s+/)[0]!);

describe("plain query", () => {
  test("SCN-QRY-013-1 plain query hides cap and change entries", async () => {
    const r = await p.run("query", "thing");
    expect(r.code, r.err).toBe(0);
    expect(ids(r.out)).toEqual(["REQ-TH-001", "REQ-TH-002"]);
    const c = await p.run("query", "--change", "009", "thing");
    expect(ids(c.out)).toEqual(["REQ-TH-002"]);
    const none = await p.run("query", "--change", "009");
    expect(ids(none.out).filter((i) => /^(cap|change)\//.test(i))).toEqual([]);
    const j = JSON.parse((await p.run("query", "thing", "--json")).out) as { kind: string }[];
    expect(j.some((e) => e.kind === "cap" || e.kind === "change")).toBe(false);
  });

  test("SCN-QRY-013-2 kind filter lists them", async () => {
    expect(ids((await p.run("query", "--kind", "cap", "thing")).out)).toEqual(["cap/thing"]);
    expect(ids((await p.run("query", "--kind", "change", "009")).out)).toEqual(["change/009"]);
    expect(ids((await p.run("query", "--kind", "change", "--change", "009")).out)).toEqual(["change/009"]);
  });
});
