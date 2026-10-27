// Covers: REQ-GOV-001, REQ-GOV-003, REQ-DIST-003, REQ-DIST-007
import { afterEach, describe, expect, test } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Project, REPO } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

describe("spec governance", () => {
  test("SCN-GOV-001-1 a copy of this repository passes check --strict", async () => {
    p = new Project(null);
    for (const d of ["openspec", "decisions", "src", "spec-ctx.toml"]) cpSync(join(REPO, d), p.path(d), { recursive: true });
    if (existsSync(join(REPO, ".ctx/evidence"))) cpSync(join(REPO, ".ctx/evidence"), p.path(".ctx/evidence"), { recursive: true });
    cpSync(join(REPO, "tests"), p.path("tests"), { recursive: true, filter: (s) => !s.includes("/tests/fixtures") });
    await p.build();
    const r = await p.run("check", "--strict");
    // warning lines for manual evidence are no findings (REQ-CHK-003)
    // REQ-CHK-004 a manual-evidence warning is advisory. No hard finding may stay.
    expect(r.out.split("\n").filter((l) => l.includes("  ") && !l.startsWith("manual-evidence  "))).toEqual([]);
    expect(r.out).toMatch(/^0 findings\n$|\(0 hard, \d+ advisory\)/);
    expect(r.code).toBe(0);
  });

  test("SCN-GOV-003-1 a markdown file with a semicolon fails the lint that CI runs", () => {
    p = new Project(null);
    p.write("openspec/bad.md", "# Bad\n\nThe tool reads the file; it writes the index.\n");
    const r = spawnSync(process.execPath, [join(REPO, "dist/cli.js"), "lint", "ste", "--baseline", "0", "--disable", "synonym-rotation", p.path("openspec/bad.md")]);
    expect(r.status).toBe(1);
    const ci = readFileSync(join(REPO, ".github/workflows/ci.yml"), "utf8");
    const specs = ci.slice(ci.indexOf("\n  specs:\n"), ci.indexOf("\n  code:\n"));
    // specctx gate runs check, both linters, and openspec validate (REQ-CLI-004)
    expect(specs).toContain("node dist/cli.js gate --strict --markdown");
    for (const g of ["openspec/**/*.md", "decisions/*.md", "docs/**/*.md", "skills/**/*.md", "schemas/**/*.md", "*.md"]) expect(specs).toContain(g);
    const hook = readFileSync(join(REPO, ".githooks/pre-commit"), "utf8");
    for (const s of ["check --strict", "validate --all --strict", "lint tells --baseline 0", "lint ste --baseline 0 --disable synonym-rotation"]) expect(hook).toContain(s);
    expect(hook).not.toContain("python3");
    // the gate lints through src/lint/counts.ts since 016
    expect(readFileSync(join(REPO, "src/cli/gate.ts"), "utf8")).toContain("lintCounts");
    expect(readFileSync(join(REPO, "src/lint/counts.ts"), "utf8")).toContain("lintTells");
  });

  test("SCN-DIST-003-1 the parity harness is green", () => {
    if (!existsSync(join(REPO, "dist/cli.js"))) execFileSync("bun", ["run", "build"], { cwd: REPO });
    const r = spawnSync("bash", [join(REPO, "tests/parity/run.sh")], { encoding: "utf8" });
    expect(r.stdout).toContain("parity: 7 commands identical");
    expect(r.status).toBe(0);
  }, 60000);

  test("SCN-DIST-003-2 the harness catches drift and names the command", () => {
    if (!existsSync(join(REPO, "dist/cli.js"))) execFileSync("bun", ["run", "build"], { cwd: REPO });
    p = new Project(null);
    cpSync(join(REPO, "tests/fixtures/parity-golden"), p.path("golden"), { recursive: true });
    // a bundle in another order is what a changed engine would print
    const lines = readFileSync(p.path("golden/bundle.out"), "utf8").split("\n");
    writeFileSync(p.path("golden/bundle.out"), [...lines.slice(1), lines[0]].join("\n"));
    const r = spawnSync("bash", [join(REPO, "tests/parity/run.sh")], { encoding: "utf8", env: { ...process.env, SPECCTX_GOLDEN: p.path("golden") } });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("(bundle)");
    expect(r.stdout).not.toContain("(status)");
  }, 60000);

  test("SCN-DIST-007-1 no ctx.py left in the listed paths", () => {
    const r = spawnSync("grep", ["-rl", "ctx" + ".py", "src", "tests/parity/run.sh", "scripts", "skills", "schemas", ".githooks", ".github", "CLAUDE.md", "README.md", "DELEGATION.md"], { cwd: REPO, encoding: "utf8" });
    expect(r.stdout).toBe("");
    expect(existsSync(join(REPO, "tools/ctx"))).toBe(false);
  });
});
