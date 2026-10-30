// Covers: REQ-VER-005, REQ-IDX-005
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, test } from "vitest";
import { loadConfig } from "../../src/config.ts";
import { closedTasks } from "../../src/gate/rerun.ts";
import { buildIndex } from "../../src/index/build.ts";
import { scanner } from "../../src/index/scan.ts";
import type { Project } from "../helpers.ts";
import { commitAll, git, gitProject } from "./gitrepo.ts";

const projects: Project[] = [];
afterEach(() => {
  while (projects.length) projects.pop()!.cleanup();
});

const T = (a: string, b: string) => `# Tasks\n\n- [${a}] 1.1 one [REQ-AA-001] Verify: \`true\`\n- [${b}] 1.2 two [REQ-AA-001] Verify: \`true\`\n`;

function closed(p: Project, base: string) {
  const cfg = loadConfig(p.root);
  const data = buildIndex(p.root, cfg);
  return closedTasks(p.root, base, data.entries, scanner(p.root, cfg).taskRe);
}

describe("closedTasks", () => {
  test("SCN-VER-005-1 only the task that changed from open to done counts", () => {
    const p = gitProject();
    projects.push(p);
    p.write("openspec/changes/036-x/tasks.md", T(" ", "x"));
    commitAll(p, "base");
    git(p, "checkout", "-q", "-b", "feature");
    p.write("openspec/changes/036-x/tasks.md", T("x", "x"));
    commitAll(p, "close 1.1");
    const r = closed(p, "main");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tasks.map((t) => t.id)).toEqual(["036/1.1"]);
  });

  test("a task absent at the merge base counts as closed", () => {
    const p = gitProject();
    projects.push(p);
    p.write("README.md", "x\n");
    commitAll(p, "base");
    git(p, "checkout", "-q", "-b", "feature");
    p.write("openspec/changes/036-x/tasks.md", T("x", " "));
    commitAll(p, "add");
    const r = closed(p, "main");
    if (!r.ok) throw new Error(r.line);
    expect(r.tasks.map((t) => t.id)).toEqual(["036/1.1"]);
  });

  test("SCN-VER-005-2 an archive in the range keeps the task ID", () => {
    const p = gitProject();
    projects.push(p);
    p.write("openspec/changes/036-x/tasks.md", T(" ", "x"));
    commitAll(p, "base");
    git(p, "checkout", "-q", "-b", "feature");
    p.write("openspec/changes/archive/2026-10-30-036-x/tasks.md", T("x", "x"));
    git(p, "rm", "-q", "-r", "openspec/changes/036-x");
    commitAll(p, "archive");
    const r = closed(p, "main");
    if (!r.ok) throw new Error(r.line);
    expect(r.tasks.map((t) => t.id)).toEqual(["036/1.1"]);
    expect(r.tasks[0]!.file).toBe("openspec/changes/archive/2026-10-30-036-x/tasks.md");
  });

  test("an active copy wins over an archived copy of one ID", () => {
    const p = gitProject();
    projects.push(p);
    p.write("openspec/changes/archive/2026-10-01-036-x/tasks.md", T("x", "x"));
    p.write("openspec/changes/036-x/tasks.md", T(" ", " "));
    commitAll(p, "base");
    git(p, "checkout", "-q", "-b", "feature");
    p.write("openspec/changes/036-x/tasks.md", T("x", " "));
    commitAll(p, "close");
    const r = closed(p, "main");
    if (!r.ok) throw new Error(r.line);
    expect(r.tasks.map((t) => t.id)).toEqual(["036/1.1"]);
    expect(r.tasks[0]!.file).toBe("openspec/changes/036-x/tasks.md");
  });

  test("SCN-VER-005-3 no merge base is a failure with the fetch hint", () => {
    const p = gitProject();
    projects.push(p);
    p.write("openspec/changes/036-x/tasks.md", T(" ", " "));
    commitAll(p, "base");
    git(p, "checkout", "-q", "--orphan", "other");
    p.write("a.txt", "a\n");
    commitAll(p, "unrelated");
    const r = closed(p, "main");
    expect(r).toEqual({ ok: false, line: "rerun: no merge base with main, fetch full history (fetch-depth: 0)" });
    const bad = closed(p, "no-such-ref");
    expect(bad.ok).toBe(false);
  });

  test("a shallow clone is named", () => {
    const p = gitProject();
    projects.push(p);
    p.write("a.txt", "a\n");
    commitAll(p, "one");
    p.write("a.txt", "b\n");
    commitAll(p, "two");
    const src = p.root;
    const q = gitProject();
    projects.push(q);
    // clone with depth 1 of a local path into a fresh folder
    const out = q.path("shallow");
    const c = spawnSync("git", ["clone", "-q", "--depth", "1", `file://${src}`, out], { encoding: "utf8" });
    expect(c.status, c.stderr).toBe(0);
    const cfg = loadConfig(out);
    const r = closedTasks(out, "origin/nothing", [], scanner(out, cfg).taskRe);
    expect(r).toEqual({ ok: false, line: "rerun: no merge base with origin/nothing, fetch full history (fetch-depth: 0). This clone is shallow" });
  });
});
