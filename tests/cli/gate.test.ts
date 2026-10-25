// Covers: REQ-CLI-004, REQ-LINT-003
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Project, REPO } from "../helpers.ts";

let p: Project;
afterEach(() => {
  p?.cleanup();
  delete process.env.SPECCTX_OPENSPEC;
});

const CLI = join(REPO, "dist/cli.js");

describe("gate", () => {
  test("SCN-CLI-004-1 a clean tree prints an ok line per gate", async () => {
    p = new Project();
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    const r = await p.run("gate", "--strict", "--markdown", "openspec/**/*.md decisions/*.md");
    expect(r.out).toMatch(/^check: ok \(strict\)\nlinters: ok \(\d+ file\(s\)\)\nvalidate: ok \(strict\)\nspec-length: ok\n$/);
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
    expect(r.out).toContain("linters: fail\ndecisions/bad.md");
    expect(r.out).not.toContain("validate:");
    p.write("decisions/bad.md", "# Good\n\nThe tool reads the file.\n");
    process.env.SPECCTX_OPENSPEC = "/bin/false";
    const v = await p.run("gate", "--markdown", "decisions/*.md");
    expect(v.code).toBe(1);
    expect(v.out).toContain("linters: ok");
    expect(v.out).toContain("validate: fail");
  });

  // REQ-LINT-003 removes the skip of SCN-CLI-004-3: with no python3 the linters still run
  test("SCN-CLI-004-3 SCN-LINT-003-1 no python3: the linters run and validate runs", () => {
    p = new Project();
    expect(existsSync(CLI)).toBe(true);
    const r = spawnSync(process.execPath, [CLI, "gate", "--root", p.root], {
      encoding: "utf8",
      env: { PATH: "/nonexistent", SPECCTX_OPENSPEC: "/bin/true", HOME: p.root },
    });
    expect(r.stdout).toMatch(/^check: ok\nlinters: ok \(\d+ file\(s\)\)\nvalidate: ok\nspec-length: ok\n$/);
    expect(r.stdout).not.toContain("skipped");
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

describe("gate log", () => {
  const log = (): Record<string, unknown>[] => readFileSync(p.path(".ctx/gate-log.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));

  // Covers: REQ-STAT-005
  test("SCN-STAT-005-4 two gate runs append two lines", async () => {
    p = new Project();
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    expect((await p.run("gate", "--markdown", "openspec/**/*.md")).code).toBe(0);
    expect((await p.run("gate", "--markdown", "openspec/**/*.md")).code).toBe(0);
    const lines = log();
    expect(lines).toHaveLength(2);
    expect(Object.keys(lines[0]!).sort()).toEqual(["at", "duration_s", "failed_step", "ok", "steps"]);
    expect(lines[0]).toMatchObject({ ok: true, failed_step: null, steps: ["check", "lint tells", "lint ste", "validate", "spec-length"] });
    expect(typeof lines[0]!.at).toBe("string");
    expect(typeof lines[0]!.duration_s).toBe("number");
  });

  test("SCN-STAT-005-1 a failure at lint tells logs ok false and the step", async () => {
    p = new Project();
    p.write("decisions/bad.md", "# Bad\n\nThe tool reads; it writes — fast.\n");
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    expect((await p.run("gate", "--markdown", "decisions/*.md")).code).toBe(1);
    expect(log().at(-1)).toMatchObject({ ok: false, failed_step: "lint tells", steps: ["check", "lint tells", "lint ste"] });
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
