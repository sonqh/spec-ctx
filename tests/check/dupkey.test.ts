// Covers: REQ-CHK-004
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { RULES, hintOf } from "../../src/check/hints.ts";
import { checkText } from "../../src/cli/commands.ts";
import { DUP_KEY_FIXTURE, KEBAB_FIXTURE, Project, REPO } from "../helpers.ts";

let p: Project | undefined;
afterEach(() => {
  p?.cleanup();
  p = undefined;
});

describe("duplicate change key", () => {
  test("SCN-CHK-004-1 two folders with key 001 are a hard finding", async () => {
    p = new Project(DUP_KEY_FIXTURE);
    const r = await p.run("check");
    expect(r.code).toBe(1);
    expect(r.out).toContain("openspec/changes/001-b:1  duplicate-change-key  001");
    expect(r.out).not.toContain("openspec/changes/001-a:1  duplicate-change-key");
    const j = JSON.parse((await p.run("check", "--json")).out);
    expect(j.findings).toContainEqual({ file: "openspec/changes/001-b", line: 1, rule: "duplicate-change-key", id: "001" });
  });

  test("SCN-CHK-004-1 an archived folder counts", async () => {
    p = new Project(KEBAB_FIXTURE);
    expect((await p.run("check")).out).not.toContain("duplicate-change-key");
    p.write("openspec/changes/archive/2026-10-01-add-mfa/tasks.md", "# Tasks\n");
    const r = await p.run("check");
    expect(r.code).toBe(1);
    expect(r.out).toContain("duplicate-change-key  add-mfa");
  });
});

describe("check summary", () => {
  // Covers: REQ-CHK-004
  test("SCN-CHK-004-2 the summary line and one line per rule with its hint", async () => {
    p = new Project();
    // three uncovered requirements and one requirement without a scenario, in two files
    p.write("openspec/specs/gamma/spec.md", "# gamma\n\n## Requirements\n\n### Requirement: REQ-AAA-007 Seven\nText.\n\n#### Scenario: SCN-AAA-007-1 S\n- a\n\n### Requirement: REQ-AAA-008 Eight\nText.\n\n#### Scenario: SCN-AAA-008-1 S\n- a\n\n### Requirement: REQ-AAA-009 Nine\nText.\n\n#### Scenario: SCN-AAA-009-1 S\n- a\n");
    p.write("openspec/specs/delta/spec.md", "# delta\n\n## Requirements\n\n### Requirement: REQ-AAA-010 Ten\nText.\n");
    p.write("tests/g.cases.ts", ["SCN-AAA-007-1", "SCN-AAA-008-1", "SCN-AAA-009-1"].map((s) => `// ${s}`).join("\n") + "\n");
    const r = await p.run("check", "--strict");
    const lines = r.out.trimEnd().split("\n");
    const at = lines.findIndex((l) => /^\d+ findings? in /.test(l));
    expect(lines[at - 1]).toBe("");
    const rules = lines.slice(at + 1);
    for (const l of rules) {
      const [rule, n, hint] = l.split("  ");
      expect(Number(n)).toBeGreaterThan(0);
      expect(hint).toBe(hintOf(rule!));
    }
    expect(lines).toContain("uncovered  4  Add a test with a Covers tag for the requirement.");
    expect(lines).toContain("req-without-scn  1  Add a scenario under the requirement.");
    expect(r.code).toBe(1);
  });

  test("SCN-CHK-004-2 four hard findings in two files", () => {
    const f = (file: string, rule: string, id: string) => ({ file, line: 1, rule, id });
    const out = checkText({
      findings: [f("a.md", "uncovered", "REQ-A-1"), f("a.md", "uncovered", "REQ-A-2"), f("b.md", "uncovered", "REQ-A-3"), f("b.md", "req-without-scn", "REQ-A-4")],
      warnings: [], baselined: 0,
    });
    expect(out.endsWith(`\n4 findings in 2 files (4 hard, 0 advisory)\nreq-without-scn  1  ${hintOf("req-without-scn")}\nuncovered  3  ${hintOf("uncovered")}\n`)).toBe(true);
  });

  test("SCN-CHK-004-3 a clean tree prints 0 findings", async () => {
    p = new Project();
    const r = await p.run("check");
    expect(r.out).toBe("0 findings\n");
    expect(r.code).toBe(0);
  });

  test("every rule of check has a hint", () => {
    const src = ["src/check/check.ts", "src/check/evidence.ts", "src/index/scan.ts", "src/index/build.ts"].map((f) => readFileSync(join(REPO, f), "utf8")).join("\n");
    const used = new Set([...src.matchAll(/"((?:[a-z]+-)+[a-z]+)"\]/g), ...src.matchAll(/, "((?:[a-z]+-)+[a-z]+)", /g)].map((m) => m[1]!));
    used.add("uncovered");
    used.add("manual-evidence");
    for (const r of used) expect(Object.keys(RULES), r).toContain(r);
  });

  test("--json output keeps its shape", async () => {
    p = new Project(DUP_KEY_FIXTURE);
    const j = JSON.parse((await p.run("check", "--json")).out);
    expect(Object.keys(j).sort()).toEqual(["baselined", "count", "findings", "warnings"]);
  });
});
