// Covers: REQ-ADOPT-002, REQ-ADOPT-004
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { parse } from "smol-toml";
import { NO_ID_FIXTURE, Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const MAIN = "openspec/specs/user-auth/spec.md";
const DELTA = "openspec/changes/add-mfa/specs/user-auth/spec.md";

describe("adopt write", () => {
  test("SCN-ADOPT-002-1 main and delta headers agree and openspec validate passes", async () => {
    p = new Project(NO_ID_FIXTURE);
    const r = await p.run("adopt");
    expect(r.code, r.err + r.out).toBe(0);
    expect(r.out).toContain("adopted 20 header(s) in 3 file(s). Report: adopt-report.md");
    expect(p.read(MAIN)).toContain("### Requirement: REQ-UA-001 Session timeout\n");
    expect(p.read(DELTA)).toContain("### Requirement: REQ-UA-001 Session timeout\n");
    expect(p.read(DELTA)).toContain("- FROM: `### Requirement: REQ-UA-003 Remember device`\n- TO: `### Requirement: REQ-UA-003 Trusted device`\n");
    expect(p.read(DELTA)).toContain("### Requirement: REQ-UA-003 Trusted device\n");
    expect(p.read(DELTA)).toContain("### Requirement: REQ-UA-004 Second factor\n");
    const v = spawnSync("npx", ["-y", "@fission-ai/openspec@latest", "validate", "--all", "--strict", "--no-interactive"], { cwd: p.root, encoding: "utf8" });
    expect(v.status, v.stdout + v.stderr).toBe(0);
  }, 120000);

  test("SCN-ADOPT-004-1 the derived codes land in spec-ctx.toml and id new accepts them", async () => {
    p = new Project(NO_ID_FIXTURE);
    await p.run("adopt");
    const t = parse(p.read("spec-ctx.toml")) as { ids: { caps: string[]; paths: Record<string, string> } };
    expect(t.ids.caps.sort()).toEqual(["PS", "UA"]);
    expect(t.ids.paths).toEqual({ PS: "profile-schema", UA: "user-auth" });
    expect((await p.run("id", "new", "REQ", "UA")).out).toBe("REQ-UA-005\n");
  });

  test("SCN-ADOPT-002-2 a write that adds a finding restores every file", async () => {
    p = new Project(NO_ID_FIXTURE);
    // a requirement header outside the spec files: adopt does not number against it, so the write makes a duplicate
    p.write("openspec/changes/add-mfa/design.md", "# Design\n\n### Requirement: REQ-UA-001 Planted\nThe plant SHALL clash.\n\n#### Scenario: SCN-UA-001-9 Clash\n- a\n");
    const before = p.snapshot();
    const r = await p.run("adopt");
    expect(r.code).toBe(1);
    expect(r.out).toContain("duplicate-id  REQ-UA-001");
    expect(r.err).toContain("adopt restored every file");
    const after = p.snapshot();
    after.delete(".ctx/index.json");
    before.delete(".ctx/index.json");
    expect(after).toEqual(before);
    expect(existsSync(p.path("spec-ctx.toml"))).toBe(false);
    expect(existsSync(p.path("adopt-report.md"))).toBe(false);
  });

  test("SCN-ADOPT-002-3 an unmatched delta header keeps its text and the report lists it", async () => {
    p = new Project(NO_ID_FIXTURE);
    p.append(DELTA, "\n### Requirement: Lockout policy\nThe system SHALL lock an account after five failures.\n\n#### Scenario: Five failures\n- **WHEN** a user fails five times\n- **THEN** the account locks\n");
    const r = await p.run("adopt");
    expect(r.code, r.err + r.out).toBe(0);
    expect(r.out).toMatch(/unmatched: openspec\/changes\/add-mfa\/specs\/user-auth\/spec\.md:\d+ {2}### Requirement: Lockout policy/);
    expect(p.read(DELTA)).toContain("\n### Requirement: Lockout policy\n");
    const report = p.read("adopt-report.md");
    expect(report).toContain("## Unmatched");
    expect(report).toContain("`### Requirement: Lockout policy`");
  });

  test("SCN-ADOPT-002-4 legacy tasks without a REQ do not block", async () => {
    p = new Project(NO_ID_FIXTURE);
    p.write("spec-ctx.toml", "# none\n");
    const pre = await p.run("check");
    expect(pre.out).toContain("task-without-req  add-mfa/1.1");
    const r = await p.run("adopt");
    expect(r.code, r.err + r.out).toBe(0);
    expect(p.read(MAIN)).toContain("REQ-UA-001");
    expect((await p.run("check")).out).toContain("task-without-req  add-mfa/1.1");
  });

  test("the report names every code, file, and header", async () => {
    p = new Project(NO_ID_FIXTURE);
    await p.run("adopt");
    const report = p.read("adopt-report.md");
    expect(report).toContain("| UA | user-auth | derived |");
    expect(report).toContain("| openspec/specs/user-auth/spec.md | 8 | `### Requirement: Session timeout` | `### Requirement: REQ-UA-001 Session timeout` |");
    expect(report.split("\n").filter((l) => l.startsWith("| openspec/"))).toHaveLength(20);
  });
});
