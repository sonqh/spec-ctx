// Covers: REQ-DIST-002, REQ-SCH-003, REQ-SKL-002
import { afterEach, describe, expect, test } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mergeConfig } from "../../src/init/init.ts";
import { Project, REPO } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

/** The tree that `openspec init --tools none` writes, as of OpenSpec 1.14.3. */
function freshOpenspec(): Project {
  const pr = new Project(null);
  pr.write("openspec/config.yaml", "schema: spec-driven\n\n# Project context (optional)\n# Example:\n#   context: |\n#     Write all artifacts in Spanish\n");
  pr.write("openspec/specs/.gitkeep", "");
  pr.write("openspec/changes/archive/.gitkeep", "");
  return pr;
}

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string, pre: string): void => {
    for (const n of readdirSync(d, { withFileTypes: true })) {
      if (n.isDirectory()) walk(join(d, n.name), `${pre}${n.name}/`);
      else out.push(pre + n.name);
    }
  };
  walk(dir, "");
  return out.sort();
}

describe("init", () => {
  test("SCN-DIST-002-3 init --all on a fresh openspec project gives a working loop", async () => {
    p = freshOpenspec();
    const r = await p.run("init", "--all");
    expect(r.code, r.err).toBe(0);
    expect(existsSync(p.path("spec-ctx.toml"))).toBe(true);
    expect(existsSync(p.path("openspec/schemas/spec-driven-ids/schema.yaml"))).toBe(true);
    expect(existsSync(p.path("openspec/schemas/spec-driven-ids/templates/spec.md"))).toBe(true);
    expect(existsSync(p.path("openspec/schemas/spec-driven-ids/config-fragment.yaml"))).toBe(false);
    for (const d of [".claude/skills", ".agents/skills"]) {
      for (const s of ["specctx-bootstrap", "specctx-next", "specctx-done"]) expect(existsSync(p.path(`${d}/${s}/SKILL.md`))).toBe(true);
    }
    const cfg = p.read("openspec/config.yaml");
    expect(cfg.startsWith("schema: spec-driven-ids\n")).toBe(true);
    expect(cfg).toContain("\nrules:\n");
    expect(cfg).toContain("\noperations:\n");
    const s = await p.run("status");
    expect(s.code).toBe(0);
    expect(s.out).toContain("no active change");
    expect((await p.run("check", "--strict")).code).toBe(0);
  });

  test("SCN-SCH-003-1 the merge adds rules and operations and leaves context unchanged", async () => {
    p = freshOpenspec();
    const context = "context: |\n  Keep every line of this block.\n  Second line.\n";
    p.write("openspec/config.yaml", `schema: spec-driven\n\n${context}`);
    expect((await p.run("init", "--schema")).code).toBe(0);
    const cfg = p.read("openspec/config.yaml");
    expect(cfg).toContain(context);
    expect(cfg).toContain("\nrules:\n  specs:\n");
    expect(cfg).toContain("\noperations:\n  apply:\n");
  });

  test("merge keeps rules that exist and adds nothing twice", () => {
    const frag = readFileSync(join(REPO, "schemas/spec-driven-ids/config-fragment.yaml"), "utf8");
    const own = "schema: spec-driven-ids\nrules:\n  proposal:\n    - Mine.\n";
    const m = mergeConfig(own, frag);
    expect(m.kept).toEqual(["rules"]);
    expect(m.added).toEqual(["operations"]);
    expect(m.text.startsWith(own)).toBe(true);
    const again = mergeConfig(m.text, frag);
    expect(again.added).toEqual([]);
    expect(again.text).toBe(m.text);
    const none = mergeConfig(null, frag);
    expect(none.text.startsWith("schema: spec-driven-ids\n")).toBe(true);
    expect(none.added).toEqual(["schema", "rules", "operations"]);
  });

  test("SCN-SCH-003-3 init --schema repairs an item that YAML reads as a mapping", async () => {
    p = freshOpenspec();
    const broken = [
      "schema: spec-driven-ids",
      "",
      "context: |",
      "  Keep: this line.",
      "",
      "rules:",
      "  specs:",
      '    - Every header starts with its ID, e.g. "### Requirement: REQ-ABC-001 Name".',
      "    - 'Already quoted: stays.'",
      "    - Plain item.",
      "    - It's a rule: with a quote.",
      "operations:",
      "  apply:",
      "    guidance:",
      "      - Run `specctx check`: then stop.",
      "",
    ].join("\n");
    p.write("openspec/config.yaml", broken);
    expect((await p.run("init", "--schema")).code).toBe(0);
    const cfg = p.read("openspec/config.yaml");
    expect(cfg).toContain("    - 'Every header starts with its ID, e.g. \"### Requirement: REQ-ABC-001 Name\".'\n");
    expect(cfg).toContain("    - 'It''s a rule: with a quote.'\n");
    expect(cfg).toContain("      - 'Run `specctx check`: then stop.'\n");
    expect(cfg).toContain("    - 'Already quoted: stays.'\n    - Plain item.\n");
    expect(cfg).toContain("context: |\n  Keep: this line.\n");
    const again = await p.run("init", "--schema");
    expect(again.code).toBe(0);
    expect(p.read("openspec/config.yaml")).toBe(cfg);
  });

  test("SCN-SKL-002-1 init --skills copies the skills byte for byte", async () => {
    p = new Project(null);
    expect((await p.run("init", "--skills")).code).toBe(0);
    const src = join(REPO, "skills");
    for (const d of [".claude/skills", ".agents/skills"]) {
      for (const s of ["specctx-bootstrap", "specctx-next", "specctx-done"]) {
        expect(filesUnder(p.path(`${d}/${s}`))).toEqual(filesUnder(join(src, s)));
        for (const f of filesUnder(join(src, s))) {
          expect(readFileSync(p.path(`${d}/${s}/${f}`)).equals(readFileSync(join(src, s, f))), `${d}/${s}/${f}`).toBe(true);
        }
      }
    }
    expect(existsSync(p.path("openspec/schemas"))).toBe(false);
  });

  test("an existing spec-ctx.toml stays with or without --force", async () => {
    p = freshOpenspec();
    p.write("spec-ctx.toml", "# mine\n");
    const r = await p.run("init", "--all");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("kept spec-ctx.toml\n");
    expect(r.out).toContain("next: specctx status");
    expect(p.read("spec-ctx.toml")).toBe("# mine\n");
    expect(existsSync(p.path(".claude/skills/specctx-done/SKILL.md"))).toBe(true);
    const f = await p.run("init", "--all", "--force");
    expect(f.code, f.err).toBe(0);
    expect(f.out).toContain("kept spec-ctx.toml");
    expect(p.read("spec-ctx.toml")).toBe("# mine\n");
    const again = await p.run("init", "--all");
    expect(again.code).toBe(0);
    expect(again.out).toContain("nothing to do");
  });

  test("SCN-DIST-002-4 init keeps files with other content, lists them, and names --force", async () => {
    p = freshOpenspec();
    p.write("spec-ctx.toml", "# mine\n");
    p.write(".claude/skills/specctx-done/SKILL.md", "my own\n");
    const r = await p.run("init", "--all");
    expect(r.code, r.err).toBe(0);
    expect(p.read("spec-ctx.toml")).toBe("# mine\n");
    expect(p.read(".claude/skills/specctx-done/SKILL.md")).toBe("my own\n");
    expect(r.out).toContain("kept spec-ctx.toml\n");
    expect(r.out).toContain("kept .claude/skills/specctx-done/SKILL.md (other content)\n");
    expect(existsSync(p.path(".claude/skills/specctx-next/SKILL.md"))).toBe(true);
    expect(existsSync(p.path("openspec/schemas/spec-driven-ids/schema.yaml"))).toBe(true);
    expect(r.out.trimEnd().split("\n").at(-1)).toBe("next: specctx init --all --force");
    const j = JSON.parse((await p.run("init", "--skills", "--json")).out);
    expect(j.changed).toEqual([".claude/skills/specctx-done/SKILL.md"]);
    const f = await p.run("init", "--skills", "--force");
    expect(f.code).toBe(0);
    expect(p.read(".claude/skills/specctx-done/SKILL.md")).toBe(readFileSync(join(REPO, "skills/specctx-done/SKILL.md"), "utf8"));
    expect(p.read("spec-ctx.toml")).toBe("# mine\n");
  });

  test("SCN-SCH-003-4 init --schema repairs the config of an adopted project without --force", async () => {
    p = freshOpenspec();
    p.write("spec-ctx.toml", "# mine\n");
    p.write("openspec/config.yaml", "schema: spec-driven-ids\n\nrules:\n  specs:\n    - Header: starts with the ID.\n");
    const r = await p.run("init", "--schema");
    expect(r.code, r.err).toBe(0);
    expect(p.read("openspec/config.yaml")).toContain("    - 'Header: starts with the ID.'\n");
    expect(p.read("spec-ctx.toml")).toBe("# mine\n");
  });
});
