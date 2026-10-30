// Covers: REQ-DIST-013
import { afterEach, describe, expect, test } from "vitest";
import { existsSync } from "node:fs";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => {
  p?.cleanup();
  delete process.env.SPECCTX_OPENSPEC;
});

const IGNORE = "node_modules\n.ctx/index.json\n.ctx/current.json\n.ctx/gate-log.jsonl\n";

function project(): Project {
  const pr = new Project(null);
  pr.write("spec-ctx.toml", "[gate]\nopenspec = \"true\"\n");
  pr.write(".gitignore", IGNORE);
  return pr;
}

describe("init --skills", () => {
  test("SCN-DIST-013-1 --skills --force leaves .gitignore unchanged", async () => {
    p = project();
    const r = await p.run("init", "--skills", "--force");
    expect(r.code, r.err).toBe(0);
    expect(existsSync(p.path(".claude/skills/specctx-run/SKILL.md"))).toBe(true);
    expect(p.read(".gitignore")).toBe(IGNORE);
  });

  test("SCN-DIST-013-2 --skills without --force leaves .gitignore unchanged", async () => {
    p = project();
    const r = await p.run("init", "--skills");
    expect(r.code, r.err).toBe(0);
    expect(existsSync(p.path(".agents/skills/specctx-run/SKILL.md"))).toBe(true);
    expect(p.read(".gitignore")).toBe(IGNORE);
  });

  test("plain init still writes the .gitignore lines", async () => {
    p = project();
    const r = await p.run("init");
    expect(r.code, r.err).toBe(0);
    expect(p.read(".gitignore")).toContain("adopt-report.md");
  });
});
