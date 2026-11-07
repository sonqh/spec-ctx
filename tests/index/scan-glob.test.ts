// Covers: REQ-IDX-015, SCN-IDX-015-1, SCN-IDX-015-2, SCN-IDX-015-3, SCN-IDX-015-4
import { afterEach, describe, expect, test } from "vitest";
import { changeFolder, changeRules } from "../../src/index/changepath.ts";
import { activeChanges } from "../../src/tasks/tasks.ts";
import { Project } from "../helpers.ts";

let p: Project | undefined;
afterEach(() => {
  p?.cleanup();
  p = undefined;
});

const TASK = "# Tasks\n\n- [ ] 1.1 Work. [REQ-AB-001] Verify: `true`\n";
const DONE = "# Tasks\n\n- [x] 1.1 Work. [REQ-AB-001] Verify: `true`\n";
const config = (...globs: string[]): string => `[scan]\nchanges = [${globs.map((g) => JSON.stringify(g)).join(", ")}]\n`;
type E = { id: string; kind: string; change: string; status: string; file: string };
const of = (idx: { entries: E[] }, kind: string): E[] => idx.entries.filter((e) => e.kind === kind);

describe("change name under a custom glob", () => {
  test("SCN-IDX-015-1 two folders keep two task IDs", async () => {
    p = new Project(null);
    p.write("openspec/.keep", "");
    p.write("spec-ctx.toml", config("work/changes/**/*.md"));
    p.write("work/changes/a/tasks.md", TASK);
    p.write("work/changes/b/tasks.md", TASK);
    const idx = await p.build();
    expect(of(idx, "task").map((e) => e.id).sort()).toEqual(["a/1.1", "b/1.1"]);
    expect(idx.entries.some((e: E) => e.id === "main/1.1")).toBe(false);
    expect(of(idx, "change").map((e) => e.id).sort()).toEqual(["change/a", "change/b"]);
  });

  test("SCN-IDX-015-2 an archived folder under the prefix loses its date", async () => {
    p = new Project(null);
    p.write("openspec/.keep", "");
    p.write("spec-ctx.toml", config("work/changes/**/*.md"));
    p.write("work/changes/a/tasks.md", TASK);
    p.write("work/changes/archive/2026-11-01-old/tasks.md", DONE);
    const idx = await p.build();
    const old = of(idx, "task").find((e) => e.id === "old/1.1")!;
    expect(old.change).toBe("old");
    expect(old.status).toBe("done");
    expect(old.file).toContain("/archive/");
    expect(of(idx, "change").find((e) => e.id === "change/old")!.status).toBe("archived");
  });

  test("SCN-IDX-015-3 a file with no folder has the change main", async () => {
    p = new Project(null);
    p.write("openspec/.keep", "");
    p.write("spec-ctx.toml", config("work/changes/**/*.md"));
    p.write("work/changes/notes.md", TASK);
    p.write("work/changes/archive/tasks.md", TASK);
    const tasks = of(await p.build(), "task");
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((e) => e.id === "main/1.1" && e.change === "main")).toBe(true);
    // a glob with no fixed prefix names no folder
    p.write("spec-ctx.toml", config("**/*.md"));
    p.write("other/a/tasks.md", TASK);
    expect(of(await p.build(), "task").every((e) => e.change === "main")).toBe(true);
  });

  test("SCN-IDX-015-4 each glob names folders under its own prefix", async () => {
    p = new Project(null);
    p.write("openspec/.keep", "");
    p.write("spec-ctx.toml", config("work/changes/**/*.md", "team/plans/**/*.md"));
    p.write("work/changes/a/tasks.md", TASK);
    p.write("team/plans/b/tasks.md", TASK);
    expect(of(await p.build(), "task").map((e) => e.id).sort()).toEqual(["a/1.1", "b/1.1"]);
  });

  test("a glob with no prefix listed first does not hide the second glob", async () => {
    p = new Project(null);
    p.write("openspec/.keep", "");
    p.write("spec-ctx.toml", config("**/*.md", "work/changes/**/*.md"));
    p.write("work/changes/a/tasks.md", TASK);
    expect(of(await p.build(), "task").map((e) => e.id)).toEqual(["a/1.1"]);
    expect(changeFolder("work/changes/a/tasks.md", changeRules(["**/*.md", "work/changes/**/*.md"]))?.dir).toBe("work/changes/a");
  });

  test("a change named like its capability keeps its folder", async () => {
    p = new Project(null);
    p.write("openspec/.keep", "");
    p.write("spec-ctx.toml", config("work/changes/**/*.md"));
    p.write("work/changes/index/specs/index/spec.md", "## ADDED Requirements\n\n### Requirement: REQ-AB-001 Thing\nText.\n");
    p.write("work/changes/index/tasks.md", TASK);
    const idx = await p.build();
    expect(of(idx, "task").map((e) => e.id)).toEqual(["index/1.1"]);
    expect(of(idx, "req")[0]!.change).toBe("index");
  });

  test("the default glob keeps main outside changes and gives main to archive/tasks.md", async () => {
    p = new Project(null);
    p.write("openspec/specs/ab/spec.md", "### Requirement: REQ-AB-001 Thing\nText.\n");
    p.write("openspec/changes/archive/tasks.md", TASK);
    p.write("openspec/changes/archive/2026-10-23-001-foundation/tasks.md", DONE);
    const idx = await p.build();
    expect(of(idx, "req")[0]!.change).toBe("main");
    expect(of(idx, "task").map((e) => e.id).sort()).toEqual(["001/1.1", "main/1.1"]);
  });

  test("a task under a custom glob is an active change, not main", async () => {
    p = new Project(null);
    p.write("openspec/.keep", "");
    p.write("spec-ctx.toml", config("work/changes/**/*.md"));
    p.write("work/changes/a/tasks.md", TASK);
    p.write("work/changes/archive/2026-11-01-old/tasks.md", DONE);
    const idx = await p.build();
    expect(activeChanges(idx.entries)).toEqual(["a"]);
  });

  test("a cap folder named archive inside a change stays active in that change", async () => {
    p = new Project(null);
    p.write("openspec/changes/foo/specs/archive/spec.md", "## ADDED Requirements\n\n### Requirement: REQ-AB-001 Thing\nText.\n");
    p.write("openspec/changes/foo/tasks.md", TASK);
    const idx = await p.build();
    const req = of(idx, "req")[0]!;
    expect(req.change).toBe("foo");
    expect(req.status).toBe("active");
  });

  test("a glob that matches only some files gives the other files no folder", async () => {
    p = new Project(null);
    p.write("openspec/.keep", "");
    p.write("spec-ctx.toml", `[scan]\nspecs = ["work/changes/**/specs/**/*.md"]\nchanges = ["work/changes/**/tasks.md"]\n`);
    p.write("work/changes/a/tasks.md", TASK);
    p.write("work/changes/a/specs/thing/spec.md", "## ADDED Requirements\n\n### Requirement: REQ-AB-001 Thing\nText.\n");
    expect(changeFolder("work/changes/a/specs/thing/spec.md", changeRules(["work/changes/**/tasks.md"]))).toBeUndefined();
    const idx = await p.build();
    expect(of(idx, "task").map((e) => e.id)).toEqual(["a/1.1"]);
    // the specs glob scans the spec file, and the changes glob does not match it
    expect(of(idx, "req").map((e) => e.change)).toEqual(["main"]);
  });
});
