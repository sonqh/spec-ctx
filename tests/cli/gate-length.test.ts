// Covers: REQ-CLI-005
import { afterEach, describe, expect, test } from "vitest";
import { requirementText } from "../../src/cli/gate.ts";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => {
  p?.cleanup();
  delete process.env.SPECCTX_OPENSPEC;
});

const DELTA = "openspec/changes/007-m/specs/alpha/spec.md";
/** A delta requirement whose text after the header is exactly n characters. */
function delta(n: number): string {
  const refs = "Refs: REQ-AAA-001";
  const fill = "The tool SHALL " + "a".repeat(n - "The tool SHALL ".length - refs.length - 1);
  return `## ADDED Requirements\n\n### Requirement: REQ-AAA-009 Long\n${fill}\n\n${refs}\n\n#### Scenario: SCN-AAA-009-1 S\n- **WHEN** a\n- **THEN** b\n`;
}

describe("gate spec length", () => {
  test("SCN-CLI-005-1 a requirement of 535 characters fails the fourth step", async () => {
    p = new Project();
    p.write(DELTA, delta(535));
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    const r = await p.run("gate", "--strict", "--markdown", "decisions/*.md");
    expect(r.out).toContain("validate: ok (strict)\nspec-length: fail REQ-AAA-009 535 chars\n");
    expect(r.code).toBe(1);
  });

  test("SCN-CLI-005-2 requirements of at most 500 characters pass", async () => {
    p = new Project();
    p.write(DELTA, delta(500));
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    const r = await p.run("gate", "--markdown", "decisions/*.md");
    expect(r.out).toMatch(/validate: ok\nspec-length: ok\n$/);
    expect(r.code).toBe(0);
  });

  test("the text counts as OpenSpec counts it", () => {
    expect(requirementText(["  One.  ", "", "Refs: X", "", "#### Scenario: S", "- a"])).toBe("One.\nRefs: X");
    expect(requirementText(["```", "# not a header", "```", "Two."])).toBe("Two.");
    expect(requirementText(["**ID**: 1", "Text."])).toBe("Text.");
    expect(requirementText(["**ID**: 1"])).toBe("**ID**: 1");
  });

  test("an archived change is not read", async () => {
    p = new Project();
    p.write("openspec/changes/archive/2026-01-01-old/specs/alpha/spec.md", delta(600));
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    expect((await p.run("gate", "--markdown", "decisions/*.md")).out).toContain("spec-length: ok\n");
  });
});
