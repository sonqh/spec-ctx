// Covers: REQ-ADOPT-008
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { baseAtMergeBase, headSubjects, isBaselineSubject, newEntries } from "../../src/baseline/ratchet.ts";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

/** Run git in the project with a fixed identity, so a commit needs no global config. */
export function git(root: string, ...args: string[]): string {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@x", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout.trim();
}

/** A repo with one commit on main that holds the given baseline, and a remote origin that points at itself. */
export function gitRepo(pr: Project, baseline: string[]): void {
  pr.write(".ctx/baseline.json", JSON.stringify(baseline, null, 2) + "\n");
  git(pr.root, "init", "-q", "-b", "main");
  git(pr.root, "add", "-A");
  git(pr.root, "commit", "-q", "-m", "base commit");
  git(pr.root, "remote", "add", "origin", pr.root);
  git(pr.root, "fetch", "-q", "origin", "main");
}

describe("newEntries", () => {
  test("a line the base lacks is new, a line it holds is not, a dropped line is nothing", () => {
    expect(newEntries(["uncovered REQ-A-001", "uncovered REQ-A-002"], ["uncovered REQ-A-001", "uncovered REQ-A-009"])).toEqual(["uncovered REQ-A-002"]);
    expect(newEntries([], ["uncovered REQ-A-001"])).toEqual([]);
    expect(newEntries(["uncovered REQ-A-001"], [])).toEqual(["uncovered REQ-A-001"]);
  });

  test("a lint line compares by count and names the base count when it rose", () => {
    const base = ["lint docs/a.md tells:dash 2", "lint docs/b.md ste:semicolon 1"];
    expect(newEntries(["lint docs/a.md tells:dash 2", "lint docs/b.md ste:semicolon 1"], base)).toEqual([]);
    expect(newEntries(["lint docs/a.md tells:dash 1"], base)).toEqual([]);
    expect(newEntries(["lint docs/a.md tells:dash 3"], base)).toEqual(["lint docs/a.md tells:dash 3 (base 2)"]);
    expect(newEntries(["lint docs/c.md tells:dash 1"], base)).toEqual(["lint docs/c.md tells:dash 1"]);
  });

  test("the result is sorted and unique", () => {
    expect(newEntries(["b x", "a y", "b x"], [])).toEqual(["a y", "b x"]);
  });
});

describe("baseAtMergeBase", () => {
  test("SCN-ADOPT-008-3 no git repository", () => {
    p = new Project();
    expect(baseAtMergeBase(p.root, "origin/main")).toEqual({ skip: "no git repository" });
  });

  test("SCN-ADOPT-008-3 no merge base with the ref", () => {
    p = new Project();
    gitRepo(p, ["uncovered REQ-A-001"]);
    expect(baseAtMergeBase(p.root, "origin/nope")).toEqual({ skip: "no merge base with origin/nope" });
  });

  test("SCN-ADOPT-008-3 no baseline file at the merge base", () => {
    p = new Project();
    gitRepo(p, []);
    git(p.root, "rm", "-q", "--cached", ".ctx/baseline.json");
    git(p.root, "commit", "-q", "-m", "drop the baseline");
    git(p.root, "fetch", "-q", "origin", "main");
    const r = baseAtMergeBase(p.root, "origin/main");
    expect(r).toHaveProperty("skip");
    expect((r as { skip: string }).skip).toMatch(/^no \.ctx\/baseline\.json at [0-9a-f]{7}$/);
  });

  test("the lines come from the merge base, not from the working tree", () => {
    p = new Project();
    gitRepo(p, ["uncovered REQ-A-001"]);
    p.write(".ctx/baseline.json", JSON.stringify(["uncovered REQ-A-001", "uncovered REQ-A-002"]) + "\n");
    const r = baseAtMergeBase(p.root, "origin/main");
    expect(r).toHaveProperty("lines", ["uncovered REQ-A-001"]);
    expect((r as { sha: string }).sha).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe("the baseline subject", () => {
  test("isBaselineSubject", () => {
    expect(isBaselineSubject("baseline: adopt day one")).toBe(true);
    expect(isBaselineSubject("  baseline: x")).toBe(true);
    expect(isBaselineSubject("fix: baseline")).toBe(false);
    expect(isBaselineSubject("")).toBe(false);
  });

  test("headSubjects reads HEAD, and the second parent of a merge commit", () => {
    p = new Project();
    gitRepo(p, []);
    expect(headSubjects(p.root)).toEqual(["base commit"]);
    git(p.root, "checkout", "-q", "-b", "feature");
    p.write("note.md", "# Note\n");
    git(p.root, "add", "-A");
    git(p.root, "commit", "-q", "-m", "baseline: new debt");
    git(p.root, "checkout", "-q", "main");
    p.write("other.md", "# Other\n");
    git(p.root, "add", "-A");
    git(p.root, "commit", "-q", "-m", "main moves");
    git(p.root, "merge", "-q", "--no-ff", "-m", "Merge feature into main", "feature");
    expect(headSubjects(p.root)).toEqual(["Merge feature into main", "baseline: new debt"]);
  });

  test("headSubjects is empty outside git", () => {
    p = new Project();
    expect(headSubjects(p.root)).toEqual([]);
  });
});
