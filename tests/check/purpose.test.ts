// Covers: REQ-CHK-011, SCN-CHK-011-1, SCN-CHK-011-2, SCN-CHK-011-3, SCN-CHK-011-4
import { afterEach, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";
import { purposeOf } from "../../src/check/purpose.ts";



let p: Project;
afterEach(() => p?.cleanup());

const DELTA = (purpose: string): string => `${purpose}## ADDED Requirements\n\n### Requirement: REQ-NEW-001 Thing\nThe system SHALL do a thing.\n\n#### Scenario: SCN-NEW-001-1 Works\n- **WHEN** a\n- **THEN** b\n`;
const PATH = (dir: string, cap = "newcap"): string => `openspec/changes/${dir}/specs/${cap}/spec.md`;

/** The ctx-repo fixture holds a new capability delta `beta` with no Purpose. Give it one, so the other cases start clean. */
function fixBeta(): void {
  p.write(PATH("001-x", "beta"), "## Purpose\nBeta does a thing.\n\n" + p.read(PATH("001-x", "beta")));
}

async function run(...flags: string[]) {
  await p.build();
  return p.run("check", ...flags);
}

describe("purposeOf", () => {
  test("line and body", () => {
    expect(purposeOf("# x\n\n## Purpose\nDo it.\n\n## Requirements\n")).toEqual({ line: 3, body: "Do it." });
    expect(purposeOf("## Purpose\n\n## ADDED Requirements\n")).toEqual({ line: 1, body: "" });
    expect(purposeOf("## ADDED Requirements\n")).toBeNull();
  });
});

describe("Purpose rules", () => {
  test("SCN-CHK-011-1 a new capability delta without Purpose is hard in strict and silent in plain check", async () => {
    p = new Project();
    fixBeta();
    p.write(PATH("001-x"), DELTA(""));
    const s = await run("--strict");
    expect(s.code, s.out).toBe(1);
    expect(s.out).toContain("delta-without-purpose  newcap");
    const plain = await run();
    expect(plain.out).not.toContain("delta-without-purpose");
    // an empty Purpose section counts as none
    p.write(PATH("001-x"), DELTA("## Purpose\n\n"));
    expect((await run("--strict")).out).toContain("delta-without-purpose  newcap");
  });

  test("SCN-CHK-011-2 a Purpose text or a known capability clears the rule", async () => {
    p = new Project();
    fixBeta();
    p.write(PATH("001-x"), DELTA("## Purpose\nThe new capability does a thing.\n\n"));
    expect((await run("--strict")).out).not.toContain("delta-without-purpose");
    // alpha has a main spec, so its delta needs no Purpose
    p.write(PATH("001-x", "alpha"), DELTA(""));
    expect((await run("--strict")).out).not.toContain("delta-without-purpose");
  });

  test("SCN-CHK-011-3 a placeholder Purpose in a main spec is a warning in both modes and keeps exit 0", async () => {
    p = new Project();
    fixBeta();
    p.write("openspec/specs/newcap/spec.md", "# newcap Specification\n\n## Purpose\nTBD - created by archiving change demo. Update Purpose after archive.\n\n## Requirements\n");
    for (const flags of [[], ["--strict"]]) {
      const r = await run(...flags);
      expect(r.out, flags.join()).toContain("warning: placeholder-purpose newcap openspec/specs/newcap/spec.md:3");
      expect(r.out).not.toContain("delta-without-purpose");
      expect(r.code, r.out).toBe(0);
    }
  });

  test("SCN-CHK-011-4 an archived delta without Purpose is ignored", async () => {
    p = new Project();
    fixBeta();
    p.write(PATH("archive/2026-11-01-002-old"), DELTA(""));
    const r = await run("--strict");
    expect(r.out).not.toContain("delta-without-purpose");
  });
});
