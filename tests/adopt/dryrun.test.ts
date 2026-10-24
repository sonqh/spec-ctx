// Covers: REQ-ADOPT-001
import { afterEach, describe, expect, test } from "vitest";
import { cpSync } from "node:fs";
import { join } from "node:path";
import { NO_ID_FIXTURE, Project, REPO } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const HEADERS = /^(### Requirement:|#### Scenario:)/;

describe("adopt --dry-run", () => {
  test("SCN-ADOPT-001-1 every header without an ID appears once and no file changes", async () => {
    p = new Project(NO_ID_FIXTURE);
    const before = p.snapshot();
    const r = await p.run("adopt", "--dry-run");
    expect(r.code).toBe(1);
    expect(p.snapshot()).toEqual(before);
    const lines = r.out.split("\n").filter((l) => l.includes("  ->  "));
    // every Requirement and Scenario header of main specs and the active delta, plus the two RENAMED lines
    let headers = 0;
    for (const f of ["openspec/specs/user-auth/spec.md", "openspec/specs/profile-schema/spec.md", "openspec/changes/add-mfa/specs/user-auth/spec.md"]) {
      const text = p.read(f).split("\n");
      text.forEach((l, i) => {
        if (HEADERS.test(l)) {
          headers++;
          expect(lines.filter((x) => x.startsWith(`${f}:${i + 1}  ${l}  ->  `)), `${f}:${i + 1}`).toHaveLength(1);
        }
      });
    }
    expect(lines).toHaveLength(headers + 2);
    expect(r.out).toContain("openspec/specs/user-auth/spec.md:8  ### Requirement: Session timeout  ->  ### Requirement: REQ-UA-001 Session timeout");
    expect(r.out).toContain("openspec/changes/add-mfa/specs/user-auth/spec.md:23  ### Requirement: Session timeout  ->  ### Requirement: REQ-UA-001 Session timeout");
    expect(r.out).toContain("cap: UA user-auth");
    const j = JSON.parse((await p.run("adopt", "--dry-run", "--json")).out);
    expect(j.edits).toHaveLength(headers + 2);
    expect(j.caps.map((c: { code: string }) => c.code).sort()).toEqual(["PS", "UA"]);
  });

  test("a requirement only in an ADDED block takes the next number after main", async () => {
    p = new Project(NO_ID_FIXTURE);
    const r = await p.run("adopt", "--dry-run");
    expect(r.out).toContain("### Requirement: Second factor  ->  ### Requirement: REQ-UA-004 Second factor");
    expect(r.out).toContain("#### Scenario: Expired code  ->  #### Scenario: SCN-UA-004-2 Expired code");
    expect(r.out).toContain("- TO: `### Requirement: Trusted device`  ->  - TO: `### Requirement: REQ-UA-003 Trusted device`");
  });

  test("SCN-ADOPT-001-2 this repository has nothing to adopt", async () => {
    p = new Project(null);
    for (const d of ["openspec", "decisions", "spec-ctx.toml"]) cpSync(join(REPO, d), p.path(d), { recursive: true });
    const r = await p.run("adopt", "--dry-run");
    expect(r).toMatchObject({ code: 0, out: "nothing to adopt\n" });
  });

  test("two requirements with one header text stop the plan", async () => {
    p = new Project(NO_ID_FIXTURE);
    p.append("openspec/specs/profile-schema/spec.md", "\n### Requirement: Unknown keys\nThe schema SHALL warn.\n\n#### Scenario: Warn\n- **WHEN** a\n- **THEN** b\n");
    const r = await p.run("adopt", "--dry-run");
    expect(r.code).toBe(2);
    expect(r.err).toContain('repeats the header "Unknown keys"');
  });
});
