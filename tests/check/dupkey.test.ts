// Covers: REQ-CHK-004
import { afterEach, describe, expect, test } from "vitest";
import { DUP_KEY_FIXTURE, KEBAB_FIXTURE, Project } from "../helpers.ts";

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
