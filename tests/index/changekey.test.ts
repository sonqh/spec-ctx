// Covers: REQ-IDX-005
import { afterEach, describe, expect, test } from "vitest";
import { changeKey, matchesChange, resolveChange, resolveTaskId } from "../../src/index/scan.ts";
import { KEBAB_FIXTURE, Project } from "../helpers.ts";

let p: Project | undefined;
afterEach(() => {
  p?.cleanup();
  p = undefined;
});

const ids = (idx: { entries: { id: string; kind: string }[] }, kind: string): string[] =>
  idx.entries.filter((e) => e.kind === kind).map((e) => e.id).sort();

describe("change key", () => {
  test("SCN-IDX-005-1 numbered folder keeps its digits", async () => {
    expect(changeKey("003-distribution")).toBe("003");
    p = new Project();
    p.write("openspec/changes/003-distribution/tasks.md", "# Tasks\n\n## 3. Ship\n\n- [ ] 3.3 Publish. [REQ-AAA-001] Verify: `true`\n");
    const idx = await p.build();
    expect(ids(idx, "task")).toContain("003/3.3");
  });

  test("SCN-IDX-005-2 kebab-case folder uses the full name", async () => {
    expect(changeKey("add-mfa")).toBe("add-mfa");
    expect(changeKey("2fa-login")).toBe("2fa-login");
    expect(changeKey("12-login")).toBe("12");
    p = new Project(KEBAB_FIXTURE);
    const idx = await p.build();
    expect(ids(idx, "task")).toEqual(["add-mfa/1.1", "add-mfa/1.2", "add-sso/1.1", "add-sso/1.2"]);
    expect(ids(idx, "decision")).toEqual(["add-mfa/D1"]);
  });

  test("SCN-IDX-005-3 the full folder name is an alias of the key", () => {
    const entries = [{ change: "003-distribution" }, { change: "add-mfa" }, { change: "main" }];
    expect(resolveChange(entries, "003")).toBe("003-distribution");
    expect(resolveChange(entries, "003-distribution")).toBe("003-distribution");
    expect(resolveChange(entries, "add-mfa")).toBe("add-mfa");
    expect(resolveChange(entries, "add")).toBeUndefined();
    expect(resolveTaskId(entries, "003-distribution/3.3")).toBe("003/3.3");
    expect(resolveTaskId(entries, "003/3.3")).toBe("003/3.3");
    expect(resolveTaskId(entries, "add-mfa/1.1")).toBe("add-mfa/1.1");
    expect(matchesChange("003-distribution", "003")).toBe(true);
    expect(matchesChange("add-mfa", "add")).toBe(false);
  });

  test("SCN-IDX-005-3 query --change takes the key or the folder", async () => {
    p = new Project(KEBAB_FIXTURE);
    const r = await p.run("query", "--kind", "task", "--change", "add-sso", "");
    expect(r.out.split("\n").filter(Boolean).map((l) => l.split(/\s+/)[0])).toEqual(["add-sso/1.1", "add-sso/1.2"]);
  });

  test("SCN-IDX-005-4 two kebab-case changes do not collide", async () => {
    p = new Project(KEBAB_FIXTURE);
    const idx = await p.build();
    expect(ids(idx, "task").filter((i) => i.endsWith("/1.1"))).toEqual(["add-mfa/1.1", "add-sso/1.1"]);
  });
});
