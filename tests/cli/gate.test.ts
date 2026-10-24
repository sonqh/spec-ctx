// Covers: REQ-CLI-004
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
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

  test("SCN-CLI-004-3 no python3 skips the linters and still runs validate", () => {
    p = new Project();
    expect(existsSync(CLI)).toBe(true);
    const r = spawnSync(process.execPath, [CLI, "gate", "--root", p.root], {
      encoding: "utf8",
      env: { PATH: "/nonexistent", SPECCTX_OPENSPEC: "/bin/true", HOME: p.root },
    });
    expect(r.stdout).toBe("check: ok\nlinters: skipped, python3 not found\nvalidate: ok\nspec-length: ok\n");
    expect(r.status).toBe(0);
  });

  test("the package ships both linters", async () => {
    const pkg = JSON.parse((await import("node:fs")).readFileSync(join(REPO, "package.json"), "utf8"));
    expect(pkg.files).toContain("scripts/tells-lint.py");
    expect(pkg.files).toContain("scripts/ste-lint.py");
  });
});
