// Covers: REQ-DIST-002, REQ-SCH-003, REQ-SKL-002
import { afterEach, describe, expect, test } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { INIT_TEXT, loadConfig } from "../../src/config.ts";
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

  test("SCN-DIST-002-6 init writes the two .gitignore lines once", async () => {
    p = freshOpenspec();
    // no .gitignore at all
    const r = await p.run("init");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("wrote .gitignore (2 lines)\n");
    expect(p.read(".gitignore")).toBe("# spec-ctx\n.ctx/index.json\nadopt-report.md\n");
    const again = await p.run("init", "--skills");
    expect(again.code).toBe(0);
    expect(again.out).toContain("kept .gitignore\n");
    expect(again.out).not.toContain("wrote .gitignore");
    expect(p.read(".gitignore")).toBe("# spec-ctx\n.ctx/index.json\nadopt-report.md\n");
    // an existing file without a final newline, with one of the two lines present
    p.write(".gitignore", "node_modules/\n/adopt-report.md");
    expect((await p.run("init", "--skills", "--force")).out).toContain("wrote .gitignore (1 line)\n");
    expect(p.read(".gitignore")).toBe("node_modules/\n/adopt-report.md\n\n# spec-ctx\n.ctx/index.json\n");
    const j = JSON.parse((await p.run("init", "--schema", "--json")).out);
    expect(j.kept).toContain(".gitignore");
    // nothing to do stays when every file and both lines are present
    expect((await p.run("init", "--skills")).out).toContain("nothing to do\n");
  });

  test("SCN-DIST-002-7 init notes a .gitignore that ignores .claude/", async () => {
    p = freshOpenspec();
    p.write(".gitignore", "dist/\n.claude/\n");
    const r = await p.run("init", "--skills");
    expect(r.code, r.err).toBe(0);
    const note = "note: .gitignore ignores .claude/. The skills under .claude/skills/ stay out of git. The copies under .agents/skills/ are tracked.";
    const lines = r.out.trimEnd().split("\n");
    expect(lines.filter((l) => l === note)).toHaveLength(1);
    // the note comes after the kept lines and before next:
    expect(lines.indexOf(note)).toBe(lines.length - 2);
    expect(lines.at(-1)).toBe("next: specctx status");
    const j = JSON.parse((await p.run("init", "--skills", "--json")).out);
    expect(j.notes).toEqual([note]);
    // no skills, no note
    p.cleanup();
    p = freshOpenspec();
    p.write(".gitignore", ".claude/\n");
    expect((await p.run("init")).out).not.toContain("note:");
    // a .gitignore without the line gives no note
    p.cleanup();
    p = freshOpenspec();
    p.write(".gitignore", "dist/\n");
    expect((await p.run("init", "--skills")).out).not.toContain("note:");
  });

  test("SCN-SCH-003-5 init --all prints the templates line before next: and init --skills does not (018/D5)", async () => {
    p = freshOpenspec();
    const line = "templates: openspec/schemas/spec-driven-ids/templates/ (spec.md, tasks.md hold the ID placeholders)";
    const r = await p.run("init", "--all");
    expect(r.code, r.err).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    expect(lines.filter((l) => l === line)).toHaveLength(1);
    expect(lines.indexOf(line)).toBe(lines.length - 2);
    expect(lines.at(-1)).toBe("next: specctx status");
    // the line names a folder that exists after init
    expect(existsSync(p.path("openspec/schemas/spec-driven-ids/templates/spec.md"))).toBe(true);
    expect(existsSync(p.path("openspec/schemas/spec-driven-ids/templates/tasks.md"))).toBe(true);
    // a second run with nothing to do still says where the templates are
    const again = await p.run("init", "--schema");
    expect(again.out).toContain("nothing to do\n");
    expect(again.out).toContain(line + "\n");
    const j = JSON.parse((await p.run("init", "--schema", "--json")).out);
    expect(j.notes).toContain(line);
    // no schema step, no line
    p.cleanup();
    p = freshOpenspec();
    expect((await p.run("init", "--skills")).out).not.toContain("templates:");
    expect((await p.run("init")).out).not.toContain("templates:");
  });

  test("SCN-DIST-002-8 init detects test/ and lib/ when tests/ and src/ are absent", async () => {
    p = freshOpenspec();
    p.write("test/a.test.ts", "");
    p.write("lib/a.ts", "");
    expect((await p.run("init")).code).toBe(0);
    const text = p.read("spec-ctx.toml");
    expect(text).toContain("# Test files that carry Covers tags and scenario IDs.\ntests = [\"test/**\"]\n");
    expect(text).toContain("# Source files that carry code tags. A code tag is a comment with a REQ ID.\ncode = [\"lib/**\"]\n");
    expect(loadConfig(p.root).scan.tests).toEqual(["test/**"]);
    expect(loadConfig(p.root).scan.code).toEqual(["lib/**"]);
    // the default wins when both dirs exist, and when neither exists
    p.cleanup();
    p = freshOpenspec();
    p.write("test/a.test.ts", "");
    p.write("tests/a.test.ts", "");
    p.write("lib/a.ts", "");
    p.write("src/a.ts", "");
    expect((await p.run("init")).code).toBe(0);
    expect(p.read("spec-ctx.toml")).toContain('\ntests = ["tests/**"]\n');
    expect(p.read("spec-ctx.toml")).toContain('\ncode = ["src/**"]\n');
    p.cleanup();
    p = freshOpenspec();
    expect((await p.run("init")).code).toBe(0);
    expect(p.read("spec-ctx.toml")).toBe(INIT_TEXT);
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
