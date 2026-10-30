// Covers: REQ-CLI-004, REQ-LINT-003, REQ-ADOPT-007, REQ-ADOPT-008, REQ-DIST-002
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Project, REPO } from "../helpers.ts";
import { git, gitRepo } from "../baseline/ratchet.test.ts";

let p: Project;
afterEach(() => {
  p?.cleanup();
  delete process.env.SPECCTX_OPENSPEC;
  delete process.env.SPECCTX_BASELINE_SUBJECT;
});

const CLI = join(REPO, "dist/cli.js");

describe("gate", () => {
  test("SCN-CLI-004-1 a clean tree prints an ok line per gate", async () => {
    p = new Project();
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    const r = await p.run("gate", "--strict", "--markdown", "openspec/**/*.md decisions/*.md");
    expect(r.out).toMatch(/^check: ok \(strict\)\nbaseline: skipped \(no git repository\)\nlinters: ok \(\d+ file\(s\)\)\nvalidate: ok \(strict\)\nspec-length: ok\n$/);
    expect(r.code).toBe(0);
  });

  test("SCN-CLI-004-2 a dangling ref stops the gate at check", async () => {
    p = new Project();
    p.append("openspec/specs/alpha/spec.md", "\nRefs: REQ-NOPE-001\n");
    p.write("decisions/bad.md", "# Bad\n\nOne; two.\n");
    process.env.SPECCTX_OPENSPEC = "/bin/false";
    const r = await p.run("gate");
    expect(r.code).toBe(1);
    expect(r.out.startsWith("check: fail\n")).toBe(true);
    expect(r.out).toContain("dangling-ref  REQ-NOPE-001");
    expect(r.out).not.toContain("linters:");
    expect(r.out).not.toContain("validate:");
  });

  test("a lint error fails the second gate and a validate error the third", async () => {
    p = new Project();
    p.write("decisions/bad.md", "# Bad\n\nThe tool reads; it writes.\n");
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    const r = await p.run("gate", "--markdown", "decisions/*.md");
    expect(r.code).toBe(1);
    expect(r.out).toContain("linters: fail, 1 new finding(s) in 1 file(s)\ndecisions/bad.md  ste:semicolon  1 (baseline 0)\n");
    expect(r.out).not.toContain("validate:");
    p.write("decisions/bad.md", "# Good\n\nThe tool reads the file.\n");
    process.env.SPECCTX_OPENSPEC = "/bin/false";
    const v = await p.run("gate", "--markdown", "decisions/*.md");
    expect(v.code).toBe(1);
    expect(v.out).toContain("linters: ok");
    expect(v.out).toContain("validate: fail");
  });

  test("SCN-CLI-004-4 the lint detail has a summary line and stops at 50 lines", async () => {
    p = new Project();
    for (let i = 0; i < 60; i++) p.write(`docs/f${String(i).padStart(2, "0")}.md`, "# F\n\nOne \u2014 two.\n");
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    const r = await p.run("gate", "--markdown", "docs/*.md");
    expect(r.code).toBe(1);
    const lines = r.out.trimEnd().split("\n");
    expect(lines[2]).toBe("linters: fail, 60 new finding(s) in 60 file(s)");
    expect(lines[3]).toBe("docs/f00.md  tells:dash  1 (baseline 0)");
    expect(lines.at(-1)).toBe("... 10 more line(s)");
    expect(lines).toHaveLength(54);
    const j = await p.run("gate", "--markdown", "docs/*.md", "--json");
    expect(j.out.trimEnd().split("\n")).toHaveLength(63);
    expect(j.out).not.toContain("more line(s)");
  });

  test("SCN-ADOPT-007-2 a count above the baseline fails the gate", async () => {
    p = new Project();
    p.write("docs/notes.md", "# Notes\n\nOne \u2014 two.\n");
    p.write(".ctx/baseline.json", JSON.stringify(["lint docs/notes.md tells:dash 1"]) + "\n");
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    const ok = await p.run("gate", "--markdown", "docs/*.md");
    expect(ok.code, ok.out).toBe(0);
    expect(ok.out).toContain("linters: ok (1 file(s), 1 baselined)");
    p.write("docs/notes.md", "# Notes\n\nOne \u2014 two \u2014 three.\n");
    const r = await p.run("gate", "--markdown", "docs/*.md");
    expect(r.code).toBe(1);
    expect(r.out).toContain("linters: fail, 1 new finding(s) in 1 file(s)\ndocs/notes.md  tells:dash  2 (baseline 1)\n");
  });

  test("SCN-CLI-004-5 the globs come from spec-ctx.toml and --markdown overrides them", async () => {
    p = new Project();
    p.write("decisions/bad.md", "# Bad\n\nThe tool reads; it writes.\n");
    p.write("docs/ok.md", "# Ok\n\nThe tool reads the file.\n");
    p.write("spec-ctx.toml", '[gate]\nmarkdown = ["docs/*.md"]\n');
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    const r = await p.run("gate");
    expect(r.out, r.out).toContain("linters: ok (1 file(s)");
    expect(r.code).toBe(0);
    const o = await p.run("gate", "--markdown", "decisions/*.md");
    expect(o.code).toBe(1);
    expect(o.out).toContain("linters: fail");
  });

  test("SCN-CLI-004-6 SCN-DIST-002-9 the OpenSpec command comes from spec-ctx.toml and the env var wins (018/D2)", async () => {
    p = new Project();
    // a stand-in for openspec that records its arguments, so the test knows which command ran
    p.write("fake-openspec.sh", "#!/bin/sh\necho \"$@\" > ran.txt\n");
    p.write("spec-ctx.toml", '[gate]\nopenspec = "sh ./fake-openspec.sh"\n');
    const r = await p.run("gate", "--markdown", "openspec/**/*.md");
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain("validate: ok");
    expect(p.read("ran.txt")).toBe("validate --all --no-interactive\n");
    p.write("spec-ctx.toml", '[gate]\nopenspec = "/bin/false"\n');
    const f = await p.run("gate", "--markdown", "openspec/**/*.md");
    expect(f.code).toBe(1);
    expect(f.out).toContain("linters: ok");
    expect(f.out).toContain("validate: fail");
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    const e = await p.run("gate", "--markdown", "openspec/**/*.md");
    expect(e.code, e.out).toBe(0);
    expect(e.out).toContain("validate: ok");
  });

  // REQ-LINT-003 removes the skip of SCN-CLI-004-3: with no python3 the linters still run
  test("SCN-CLI-004-3 SCN-LINT-003-1 no python3: the linters run and validate runs", () => {
    p = new Project();
    expect(existsSync(CLI)).toBe(true);
    const r = spawnSync(process.execPath, [CLI, "gate", "--root", p.root], {
      encoding: "utf8",
      env: { PATH: "/nonexistent", SPECCTX_OPENSPEC: "/bin/true", HOME: p.root },
    });
    expect(r.stdout).toMatch(/^check: ok\nbaseline: skipped \(no git repository\)\nlinters: ok \(\d+ file\(s\)\)\nvalidate: ok\nspec-length: ok\n$/);
    expect(r.stdout.split("\n").filter((l) => l.includes("skipped"))).toEqual(["baseline: skipped (no git repository)"]);
    expect(r.status).toBe(0);
  });

  test("SCN-LINT-003-2 the Python scripts are gone from the tree and the package", () => {
    expect(existsSync(join(REPO, "scripts/tells-lint.py"))).toBe(false);
    expect(existsSync(join(REPO, "scripts/ste-lint.py"))).toBe(false);
    // npm pack runs prepare, which writes into src/. A temp copy without lifecycle scripts keeps the repo clean.
    p = new Project(null);
    const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
    delete pkg.scripts;
    p.write("package.json", JSON.stringify(pkg, null, 2) + "\n");
    for (const f of [...pkg.files, "README.md", "LICENSE"]) if (existsSync(join(REPO, f))) cpSync(join(REPO, f), p.path(f), { recursive: true });
    p.write("scripts/tells-lint.py", "# outside the files list\n");
    const r = spawnSync("npm", ["pack", "--dry-run", "--json"], { cwd: p.root, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    const files: string[] = JSON.parse(r.stdout)[0].files.map((f: { path: string }) => f.path);
    expect(files.length).toBeGreaterThan(0);
    expect(files.filter((f) => f.endsWith(".py"))).toEqual([]);
  }, 60000);
});

describe("gate baseline step", () => {
  const BASE = ["uncovered REQ-UA-001"];
  /** A repo whose merge base holds BASE and whose working file holds BASE plus one new entry. */
  function withNewEntry(): Project {
    const pr = new Project();
    gitRepo(pr, BASE);
    pr.write(".ctx/baseline.json", JSON.stringify([...BASE, "uncovered REQ-UA-002"], null, 2) + "\n");
    return pr;
  }

  test("SCN-ADOPT-008-1 a new entry fails the gate before the linters", async () => {
    p = withNewEntry();
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    const r = await p.run("gate", "--markdown", "openspec/**/*.md");
    expect(r.code).toBe(1);
    expect(r.out).toBe("check: ok\nbaseline: fail, 1 new entry\nuncovered REQ-UA-002\n");
    expect(r.out).not.toContain("linters:");
    const log = JSON.parse(p.read(".ctx/gate-log.jsonl").trim().split("\n").at(-1)!);
    expect(log).toMatchObject({ ok: false, failed_step: "baseline", steps: ["check", "baseline"] });
    // a committed new entry fails too, because the merge base is the first commit
    git(p.root, "checkout", "-q", "-b", "feature");
    git(p.root, "add", "-A");
    git(p.root, "commit", "-q", "-m", "feat: hide debt");
    const c = await p.run("gate", "--markdown", "openspec/**/*.md");
    expect(c.code).toBe(1);
    expect(c.out).toContain("baseline: fail, 1 new entry\n");
  });

  test("a risen lint count is a new entry, and the detail stops at 50 lines", async () => {
    p = new Project();
    gitRepo(p, ["lint docs/a.md tells:dash 1"]);
    const many = Array.from({ length: 60 }, (_, i) => `uncovered REQ-ZZ-${String(i).padStart(3, "0")}`);
    p.write(".ctx/baseline.json", JSON.stringify(["lint docs/a.md tells:dash 2", ...many], null, 2) + "\n");
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    const r = await p.run("gate", "--markdown", "openspec/**/*.md");
    expect(r.code).toBe(1);
    const lines = r.out.trimEnd().split("\n");
    expect(lines[1]).toBe("baseline: fail, 61 new entries");
    expect(lines[2]).toBe("lint docs/a.md tells:dash 2 (base 1)");
    expect(lines.at(-1)).toBe("... 11 more line(s)");
    expect(lines).toHaveLength(53);
    const j = await p.run("gate", "--markdown", "openspec/**/*.md", "--json");
    expect(j.out.trimEnd().split("\n")).toHaveLength(63);
  });

  test("SCN-ADOPT-008-2 a baseline: subject passes, from the commit or from the env var", async () => {
    p = withNewEntry();
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    process.env.SPECCTX_BASELINE_SUBJECT = "baseline: adopt day one";
    const e = await p.run("gate", "--markdown", "openspec/**/*.md");
    expect(e.code, e.out).toBe(0);
    expect(e.out).toContain("check: ok\nbaseline: ok (baseline: commit)\nlinters: ok");
    delete process.env.SPECCTX_BASELINE_SUBJECT;
    git(p.root, "checkout", "-q", "-b", "feature");
    git(p.root, "add", "-A");
    git(p.root, "commit", "-q", "-m", "baseline: adopt day one");
    const c = await p.run("gate", "--markdown", "openspec/**/*.md");
    expect(c.code, c.out).toBe(0);
    expect(c.out).toContain("baseline: ok (baseline: commit)\n");
    // the env var does not help a subject that lacks the prefix
    process.env.SPECCTX_BASELINE_SUBJECT = "feat: hide debt";
    expect((await p.run("gate", "--markdown", "openspec/**/*.md")).code).toBe(1);
  });

  test("SCN-ADOPT-008-3 no merge base or no file at the merge base skips the step", async () => {
    p = new Project();
    gitRepo(p, BASE);
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    p.write("spec-ctx.toml", '[gate]\nbase = "origin/nope"\n');
    const r = await p.run("gate", "--markdown", "openspec/**/*.md");
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain("check: ok\nbaseline: skipped (no merge base with origin/nope)\nlinters: ok");
    p.write("spec-ctx.toml", '[gate]\nbase = "main"\n');
    git(p.root, "rm", "-q", "--cached", ".ctx/baseline.json");
    git(p.root, "commit", "-q", "-m", "drop");
    const d = await p.run("gate", "--markdown", "openspec/**/*.md");
    expect(d.code, d.out).toBe(0);
    expect(d.out).toMatch(/\nbaseline: skipped \(no \.ctx\/baseline\.json at [0-9a-f]{7}\)\n/);
  });

  test("an unchanged or smaller baseline passes with baseline: ok", async () => {
    p = new Project();
    gitRepo(p, [...BASE, "uncovered REQ-UA-002"]);
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    const same = await p.run("gate", "--markdown", "openspec/**/*.md");
    expect(same.code, same.out).toBe(0);
    expect(same.out).toContain("check: ok\nbaseline: ok\nlinters: ok");
    p.write(".ctx/baseline.json", JSON.stringify(BASE) + "\n");
    expect((await p.run("gate", "--markdown", "openspec/**/*.md")).out).toContain("baseline: ok\n");
  });

  test("gate.base must be a string that is not empty", async () => {
    p = new Project();
    p.write("spec-ctx.toml", "[gate]\nbase = 3\n");
    const r = await p.run("gate");
    expect(r.code).toBe(2);
    expect(r.err).toContain("gate.base must be a string that is not empty.");
  });
});

describe("gate log", () => {
  const log = (): Record<string, unknown>[] => readFileSync(p.path(".ctx/gate-log.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));

  // Covers: REQ-STAT-005
  test("SCN-STAT-005-4 SCN-CLI-004-7 two gate runs append two lines with the six steps in order", async () => {
    p = new Project();
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    expect((await p.run("gate", "--markdown", "openspec/**/*.md")).code).toBe(0);
    expect((await p.run("gate", "--markdown", "openspec/**/*.md")).code).toBe(0);
    const lines = log();
    expect(lines).toHaveLength(2);
    expect(Object.keys(lines[0]!).sort()).toEqual(["at", "duration_s", "failed_step", "ok", "steps", "strict"]);
    expect(lines[0]).toMatchObject({ ok: true, failed_step: null, steps: ["check", "baseline", "lint tells", "lint ste", "validate", "spec-length"] });
    expect(typeof lines[0]!.at).toBe("string");
    expect(typeof lines[0]!.duration_s).toBe("number");
  });

  // Covers: REQ-STAT-005
  test("SCN-STAT-005-7 the log line records whether the run was strict", async () => {
    p = new Project();
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    expect((await p.run("gate", "--markdown", "openspec/**/*.md")).code).toBe(0);
    expect((await p.run("gate", "--strict", "--markdown", "openspec/**/*.md")).code).toBe(0);
    expect(log().map((l) => l.strict)).toEqual([false, true]);
  });

  test("SCN-STAT-005-1 a failure at lint tells logs ok false and the step", async () => {
    p = new Project();
    p.write("decisions/bad.md", "# Bad\n\nThe tool reads; it writes — fast.\n");
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    expect((await p.run("gate", "--markdown", "decisions/*.md")).code).toBe(1);
    expect(log().at(-1)).toMatchObject({ ok: false, failed_step: "lint tells", steps: ["check", "baseline", "lint tells", "lint ste"] });
  });

  test("a failure at check or validate names that step", async () => {
    p = new Project();
    process.env.SPECCTX_OPENSPEC = "/bin/false";
    expect((await p.run("gate", "--markdown", "openspec/**/*.md")).code).toBe(1);
    expect(log().at(-1)).toMatchObject({ ok: false, failed_step: "validate" });
    p.append("openspec/specs/alpha/spec.md", "\nRefs: REQ-NOPE-001\n");
    expect((await p.run("gate")).code).toBe(1);
    expect(log().at(-1)).toMatchObject({ ok: false, failed_step: "check", steps: ["check"] });
    expect(log()).toHaveLength(2);
  });
});
