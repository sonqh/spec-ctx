// Covers: REQ-LINT-001
import { afterEach, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

describe("specctx lint", () => {
  test("SCN-LINT-001-2 both selftests pass and print what the Python scripts print", async () => {
    p = new Project(null);
    const t = await p.run("lint", "tells", "--selftest");
    expect([t.code, t.out]).toEqual([0, "selftest ok\n"]);
    const s = await p.run("lint", "ste", "--selftest");
    expect([s.code, s.out]).toEqual([0, "selftest OK\n"]);
  });

  test("baseline, disable, and json set the exit code and the output", async () => {
    p = new Project(null);
    p.write("a.md", "One; two — three.\n");
    const t = await p.run("lint", "tells", "a.md");
    expect([t.code, t.out]).toEqual([1, "a.md:1: [hard] dash: —\n1 hard finding(s), baseline 0\n"]);
    expect((await p.run("lint", "tells", "--baseline", "1", "a.md")).code).toBe(0);
    expect((await p.run("lint", "tells", "--disable", "dash", "a.md")).code).toBe(0);
    const s = await p.run("lint", "ste", "a.md", "--json");
    expect(s.code).toBe(1);
    expect(JSON.parse(s.out)).toMatchObject({ count: 1, hard_count: 1, baseline: 0, words: 4 });
    expect(s.out).toContain('"per_100_words": 25.0\n');
    expect((await p.run("lint", "ste", "--disable", "semicolon", "a.md")).code).toBe(0);
  });

  test("a usage error exits 2", async () => {
    p = new Project(null);
    p.write("a.md", "Text.\n");
    expect((await p.run("lint", "ste", "--disable", "passive", "a.md")).code).toBe(2);
    expect((await p.run("lint", "tells", "--disable", "nope", "a.md")).code).toBe(2);
    expect((await p.run("lint", "tells", "a.md", "--json", "a.md")).code).toBe(2);
    expect((await p.run("lint", "ste", "missing.md")).code).toBe(2);
    const r = await p.run("lint");
    expect([r.code, r.err]).toEqual([2, "specctx: lint needs a subcommand: tells, ste\n"]);
  });

  test("help lists both linters under Read", async () => {
    p = new Project(null);
    const help = (await p.run("--help")).out;
    const read = help.slice(help.indexOf("Read:"), help.indexOf("Write:"));
    expect(read).toContain("`lint tells <file...>`");
    expect(read).toContain("`lint ste <file...>`");
  });
});
