// Covers: REQ-GOV-001, REQ-GOV-003, REQ-DIST-003
import { afterEach, describe, expect, test } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync } from "node:fs";
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
    expect(r.out).toBe("0 finding(s)\n");
    expect(r.code).toBe(0);
  });

  test("SCN-GOV-003-1 a markdown file with a semicolon fails the lint that CI runs", () => {
    p = new Project(null);
    p.write("openspec/bad.md", "# Bad\n\nThe tool reads the file; it writes the index.\n");
    const r = spawnSync("python3", [join(REPO, "scripts/ste-lint.py"), "--baseline", "0", "--disable", "synonym-rotation", p.path("openspec/bad.md")]);
    expect(r.status).toBe(1);
    const ci = readFileSync(join(REPO, ".github/workflows/ci.yml"), "utf8");
    const specs = ci.slice(ci.indexOf("  specs:"), ci.indexOf("  code:"));
    expect(specs).toContain("find openspec docs skills -name '*.md'");
    expect(specs).toContain("scripts/ste-lint.py --baseline 0 --disable synonym-rotation");
    expect(specs).toContain("scripts/tells-lint.py --baseline 0");
    expect(specs).toContain("check --strict");
    expect(specs).toContain("validate --all --strict");
    const hook = readFileSync(join(REPO, ".githooks/pre-commit"), "utf8");
    for (const s of ["check --strict", "validate --all --strict", "tells-lint.py", "ste-lint.py"]) expect(hook).toContain(s);
  });

  test("SCN-DIST-003-1 the parity harness is green", () => {
    if (!existsSync(join(REPO, "dist/cli.js"))) execFileSync("bun", ["run", "build"], { cwd: REPO });
    const r = spawnSync("bash", [join(REPO, "tests/parity/run.sh")], { encoding: "utf8" });
    expect(r.stdout).toContain("parity: 7 commands identical");
    expect(r.status).toBe(0);
  }, 60000);
});
