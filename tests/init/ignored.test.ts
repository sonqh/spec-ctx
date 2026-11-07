// Covers: REQ-DIST-018, REQ-DIST-002
import { afterEach, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

function fresh(gitignore: string | null): Project {
  const pr = new Project(null);
  pr.write("openspec/config.yaml", "schema: spec-driven\n");
  pr.write("openspec/specs/.gitkeep", "");
  pr.write("openspec/changes/archive/.gitkeep", "");
  if (gitignore !== null) pr.write(".gitignore", gitignore);
  return pr;
}

const CLAUDE = "note: .gitignore ignores .claude/. The skills under .claude/ stay out of git.";
const BOTH = "note: .gitignore ignores .claude/ and .agents/. The skills under .claude/ and .agents/ stay out of git.";

describe("REQ-DIST-018 ignored agent folders", () => {
  test("SCN-DIST-018-1 the claude folder without --skills", async () => {
    p = fresh("dist/\n.claude/\n");
    const r = await p.run("init");
    expect(r.code, r.err).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    expect(lines.filter((l) => l.startsWith("note: .gitignore"))).toEqual([CLAUDE]);
    // a second run, where nothing else changes, prints the note too
    const again = await p.run("init");
    expect(again.out).toContain("nothing to do");
    expect(again.out.split("\n").filter((l) => l === CLAUDE)).toHaveLength(1);
    // with --skills the note stays single
    const sk = await p.run("init", "--skills");
    expect(sk.out.split("\n").filter((l) => l.startsWith("note: .gitignore"))).toEqual([CLAUDE]);
  });

  test("SCN-DIST-018-2 both folders, with and without a slash", async () => {
    p = fresh(".claude/\n.agents\n");
    const r = await p.run("init");
    expect(r.code, r.err).toBe(0);
    expect(r.out.split("\n").filter((l) => l.startsWith("note: .gitignore"))).toEqual([BOTH]);
    const j = JSON.parse((await p.run("init", "--json")).out);
    expect(j.notes.filter((n: string) => n === BOTH)).toHaveLength(1);
  });

  test("SCN-DIST-018-3 no ignored folder", async () => {
    p = fresh("dist/\n");
    expect((await p.run("init")).out).not.toContain("note: .gitignore");
    expect((await p.run("init", "--skills")).out).not.toContain("note: .gitignore");
    p.cleanup();
    p = fresh(null);
    expect((await p.run("init", "--all")).out).not.toContain("note: .gitignore");
  });
});
