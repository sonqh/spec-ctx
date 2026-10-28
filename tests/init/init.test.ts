// Covers: REQ-DIST-002, REQ-SCH-003, REQ-SKL-002
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { INIT_TEXT, loadConfig } from "../../src/config.ts";
import { mergeConfig, OPENSPEC_NOTE } from "../../src/init/init.ts";
import { Project, REPO } from "../helpers.ts";

let p: Project;
afterEach(() => {
  p?.cleanup();
  delete process.env.SPECCTX_OPENSPEC;
});

const CLI = join(REPO, "dist/cli.js");

/** Run `init` in a child process with a fake `npx` first on PATH, so the detection never reaches the network. */
function initWithFakeNpx(pr: Project, script: string): { status: number | null; stdout: string } {
  pr.write("bin/npx", script);
  chmodSync(pr.path("bin/npx"), 0o755);
  const r = spawnSync(process.execPath, [CLI, "init", "--root", pr.root], {
    encoding: "utf8",
    env: { PATH: pr.path("bin"), HOME: pr.root },
  });
  return { status: r.status, stdout: r.stdout };
}

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
    // SCN-SCH-003-7 the templates only, on the stock schema
    expect(existsSync(p.path("openspec/schemas"))).toBe(false);
    expect(filesUnder(p.path("openspec/templates/spec-driven-ids"))).toEqual(["design.md", "proposal.md", "spec.md", "tasks.md"]);
    expect(existsSync(p.path("openspec/templates/spec-driven-ids/config-fragment.yaml"))).toBe(false);
    for (const d of [".claude/skills", ".agents/skills"]) {
      for (const s of ["specctx-run", "specctx-bootstrap", "specctx-next", "specctx-done"]) expect(existsSync(p.path(`${d}/${s}/SKILL.md`))).toBe(true);
    }
    const cfg = p.read("openspec/config.yaml");
    expect(cfg.startsWith("schema: spec-driven\n")).toBe(true);
    expect(cfg).not.toContain("spec-driven-ids\n");
    expect(cfg).toContain("\nrules:\n");
    expect(cfg).toContain("\noperations:\n");
    expect(cfg).toContain("Close each task only with `specctx task done <id>`. Never edit a checkbox. Never run `/opsx:apply`; run the `specctx-run` skill.");
    expect(cfg).toContain("openspec/templates/spec-driven-ids/");
    expect(cfg).not.toContain("mark complete as you go");
    expect(r.out).not.toContain("note:");
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

  test("merge adds the lists of an existing key and adds nothing twice (022/D4)", () => {
    const frag = readFileSync(join(REPO, "schemas/spec-driven-ids/config-fragment.yaml"), "utf8");
    const own = "schema: spec-driven\nrules:\n  proposal:\n    - Mine.\n";
    const m = mergeConfig(own, frag);
    expect(m.kept).toEqual([]);
    expect(m.merged).toEqual([{ key: "rules", added: 8 }]);
    expect(m.added).toEqual(["operations"]);
    expect(m.text.startsWith(own)).toBe(true);
    // the three lists of the fragment follow the own list, in fragment order
    expect(m.text.indexOf("\n  specs:\n")).toBeGreaterThan(m.text.indexOf("    - Mine.\n"));
    expect(m.text.indexOf("\n  design:\n")).toBeGreaterThan(m.text.indexOf("\n  specs:\n"));
    expect(m.text.indexOf("\n  tasks:\n")).toBeGreaterThan(m.text.indexOf("\n  design:\n"));
    expect(m.text.indexOf("\noperations:\n")).toBeGreaterThan(m.text.indexOf("\n  tasks:\n"));
    const again = mergeConfig(m.text, frag);
    expect(again.added).toEqual([]);
    expect(again.merged).toEqual([]);
    expect(again.kept).toEqual(["rules", "operations"]);
    expect(again.text).toBe(m.text);
    // no schema line is written. The project owns that key (025/D5)
    const none = mergeConfig(null, frag);
    expect(none.text.startsWith("rules:\n")).toBe(true);
    expect(none.added).toEqual(["rules", "operations"]);
    const legacy = mergeConfig("schema: spec-driven-ids\n", frag);
    expect(legacy.text.startsWith("schema: spec-driven-ids\n")).toBe(true);
    expect(legacy.added).toEqual(["rules", "operations"]);
  });

  test("SCN-SCH-003-6 init --schema merges rules items into an existing key and skips an item that exists (022/D4)", async () => {
    p = freshOpenspec();
    const own = [
      "schema: spec-driven",
      "",
      "rules:",
      "  specs:",
      "    - 'Write in English.'",
      "    - 'Every scenario header starts with its ID, e.g. \"#### Scenario: SCN-ABC-001-1 Name\".'",
      "",
      "operations:",
      "  apply:",
      "    guidance:",
      "      - 'Run the tests.'",
      "  archive:",
      "    guidance:",
      "      - 'Run `specctx check --strict` and `openspec validate --all --strict`. Both must pass before archive.'",
      "",
    ].join("\n");
    p.write("openspec/config.yaml", own);
    const r = await p.run("init", "--schema");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("merged openspec/config.yaml rules (7 added)\n");
    expect(r.out).toContain("merged openspec/config.yaml operations (5 added)\n");
    const cfg = p.read("openspec/config.yaml");
    const lines = cfg.split("\n");
    // the two own items stay first, the three other fragment items follow, the scenario rule is not added twice
    const specs = lines.indexOf("  specs:");
    expect(lines[specs + 1]).toBe("    - 'Write in English.'");
    expect(lines[specs + 2]).toContain("Every scenario header starts with its ID");
    expect(lines[specs + 3]).toContain("Every requirement header starts with its ID");
    expect(lines[specs + 4]).toContain("Refs:");
    expect(lines[specs + 5]).toContain("under 500 characters");
    expect(lines[specs + 6]).toContain("openspec/templates/spec-driven-ids/");
    expect(lines.filter((l) => l.includes("Every scenario header starts with its ID"))).toHaveLength(1);
    // the lists the own file lacked come after, and the context of operations stays
    expect(cfg).toContain("\n  design:\n    - 'Each decision is one bullet");
    expect(cfg).toContain("\n  tasks:\n    - 'Every task cites");
    expect(cfg).toContain("      - 'Run the tests.'\n      - 'Start each task with `specctx task start <id>`");
    expect(lines.filter((l) => l.includes("Both must pass before archive"))).toHaveLength(1);
    expect(cfg).toContain("      - 'Run `openspec validate --all --strict` again after archive and before push.'\n");
    expect(cfg.startsWith("schema: spec-driven\n")).toBe(true);
    // a second run adds nothing
    const again = await p.run("init", "--schema");
    expect(again.out).toContain("nothing to do\n");
    expect(p.read("openspec/config.yaml")).toBe(cfg);
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
    const first = await p.run("init", "--schema");
    expect(first.code).toBe(0);
    const cfg = p.read("openspec/config.yaml");
    // SCN-SCH-003-8 a legacy schema value gets the note and stays
    expect(first.out).toContain("note: schema spec-driven-ids is no longer installed. Set schema: spec-driven in openspec/config.yaml. The rules now carry the ID instructions.\n");
    expect(cfg.startsWith("schema: spec-driven-ids\n")).toBe(true);
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
      for (const s of ["specctx-run", "specctx-bootstrap", "specctx-next", "specctx-done"]) {
        expect(filesUnder(p.path(`${d}/${s}`))).toEqual(filesUnder(join(src, s)));
        for (const f of filesUnder(join(src, s))) {
          expect(readFileSync(p.path(`${d}/${s}/${f}`)).equals(readFileSync(join(src, s, f))), `${d}/${s}/${f}`).toBe(true);
        }
      }
    }
    expect(existsSync(p.path("openspec/templates"))).toBe(false);
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
    expect(existsSync(p.path("openspec/templates/spec-driven-ids/spec.md"))).toBe(true);
    expect(r.out.trimEnd().split("\n").at(-1)).toBe("next: specctx init --all --force");
    const j = JSON.parse((await p.run("init", "--skills", "--json")).out);
    expect(j.changed).toEqual([".claude/skills/specctx-done/SKILL.md"]);
    const f = await p.run("init", "--skills", "--force");
    expect(f.code).toBe(0);
    expect(p.read(".claude/skills/specctx-done/SKILL.md")).toBe(readFileSync(join(REPO, "skills/specctx-done/SKILL.md"), "utf8"));
    expect(p.read("spec-ctx.toml")).toBe("# mine\n");
  });

  test("SCN-DIST-002-6 init writes the four .gitignore lines once (022/D5)", async () => {
    p = freshOpenspec();
    const four = "# spec-ctx\n.ctx/index.json\nadopt-report.md\n.ctx/current.json\n.ctx/gate-log.jsonl\n";
    // no .gitignore at all
    const r = await p.run("init");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("wrote .gitignore (4 lines)\n");
    expect(p.read(".gitignore")).toBe(four);
    const again = await p.run("init", "--skills");
    expect(again.code).toBe(0);
    expect(again.out).toContain("kept .gitignore\n");
    expect(again.out).not.toContain("wrote .gitignore");
    expect(p.read(".gitignore")).toBe(four);
    // an existing file without a final newline, with three of the four lines present
    p.write(".gitignore", "node_modules/\n/adopt-report.md\n.ctx/current.json\n.ctx/gate-log.jsonl");
    expect((await p.run("init", "--skills", "--force")).out).toContain("wrote .gitignore (1 line)\n");
    expect(p.read(".gitignore")).toBe("node_modules/\n/adopt-report.md\n.ctx/current.json\n.ctx/gate-log.jsonl\n\n# spec-ctx\n.ctx/index.json\n");
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
    const line = "templates: openspec/templates/spec-driven-ids/ (spec.md, tasks.md hold the ID placeholders)";
    const r = await p.run("init", "--all");
    expect(r.code, r.err).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    expect(lines.filter((l) => l === line)).toHaveLength(1);
    expect(lines.indexOf(line)).toBe(lines.length - 2);
    expect(lines.at(-1)).toBe("next: specctx status");
    // the line names a folder that exists after init
    expect(existsSync(p.path("openspec/templates/spec-driven-ids/spec.md"))).toBe(true);
    expect(existsSync(p.path("openspec/templates/spec-driven-ids/tasks.md"))).toBe(true);
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

  test("SCN-DIST-002-10 init pins the OpenSpec version, falls back to @latest with a note, and takes the env var (022/D2)", async () => {
    // a fake npx that prints a version: the pin
    p = new Project(null);
    const ok = initWithFakeNpx(p, `#!/bin/sh\necho "$@" > "${p.path("bin/ran.txt")}"\necho 9.9.9\n`);
    expect(ok.status, ok.stdout).toBe(0);
    expect(p.read("bin/ran.txt")).toBe("-y @fission-ai/openspec@latest --version\n");
    expect(p.read("spec-ctx.toml")).toContain('\nopenspec = "npx -y @fission-ai/openspec@9.9.9"\n');
    expect(loadConfig(p.root).gate.openspec).toBe("npx -y @fission-ai/openspec@9.9.9");
    expect(ok.stdout).not.toContain("note:");
    // a fake npx that fails: @latest and the note
    p.cleanup();
    p = new Project(null);
    const bad = initWithFakeNpx(p, "#!/bin/sh\nexit 1\n");
    expect(bad.status).toBe(0);
    expect(p.read("spec-ctx.toml")).toContain('\nopenspec = "npx -y @fission-ai/openspec@latest"\n');
    expect(bad.stdout).toContain(OPENSPEC_NOTE + "\n");
    // the env var at init time is written as it is, and no command runs
    p.cleanup();
    p = new Project(null);
    process.env.SPECCTX_OPENSPEC = "openspec";
    const r = await p.run("init");
    expect(r.code, r.err).toBe(0);
    expect(p.read("spec-ctx.toml")).toContain('\nopenspec = "openspec"\n');
    expect(r.out).not.toContain("note:");
    // an existing spec-ctx.toml stays, so no detection runs and no note prints
    p.cleanup();
    p = new Project(null);
    p.write("spec-ctx.toml", "# mine\n");
    const kept = initWithFakeNpx(p, "#!/bin/sh\nexit 1\n");
    expect(kept.status).toBe(0);
    expect(kept.stdout).not.toContain("note:");
    expect(p.read("spec-ctx.toml")).toBe("# mine\n");
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
    // SCN-SCH-003-8 the legacy value stays, the note prints on the write run, on nothing to do, and in the JSON
    expect(p.read("openspec/config.yaml").startsWith("schema: spec-driven-ids\n")).toBe(true);
    const note = "note: schema spec-driven-ids is no longer installed. Set schema: spec-driven in openspec/config.yaml. The rules now carry the ID instructions.";
    expect(r.out).toContain(note + "\n");
    const again = await p.run("init", "--schema", "--json");
    expect(again.code).toBe(0);
    expect(JSON.parse(again.out).notes).toContain(note);
    expect(p.read("openspec/config.yaml").startsWith("schema: spec-driven-ids\n")).toBe(true);
  });
});
