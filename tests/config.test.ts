// Covers: REQ-DIST-002, REQ-LOOP-003
import { afterEach, describe, expect, test } from "vitest";
import { existsSync } from "node:fs";
import { defaults, loadConfig } from "../src/config.ts";
import { Project } from "./helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

describe("config", () => {
  test("SCN-DIST-002-1 no spec-ctx.toml means the default scan paths", async () => {
    p = new Project();
    expect(existsSync(p.path("spec-ctx.toml"))).toBe(false);
    expect(loadConfig(p.root)).toEqual(defaults());
    const idx = await p.build();
    const files = new Set(idx.entries.map((e: { file: string }) => e.file));
    expect(files).toContain("openspec/specs/alpha/spec.md");
    expect(files).toContain("openspec/changes/001-x/tasks.md");
    expect(files).toContain("decisions/ADR-001-sample.md");
    expect(files).toContain("src/a.ts");
    expect(files).toContain("tests/a.cases.ts");
  });

  test("missing keys take defaults and a string is a one item list", () => {
    p = new Project();
    p.write("spec-ctx.toml", '[scan]\ncode = "lib/**"\n[bundle]\nbudget = 500\n');
    const c = loadConfig(p.root);
    expect(c.scan.code).toEqual(["lib/**"]);
    expect(c.scan.tests).toEqual(["tests/**"]);
    expect(c.bundle).toEqual({ budget: 500, depth: 1 });
    expect(c.ids).toEqual(defaults().ids);
  });

  test("SCN-DIST-002-5 gate.markdown is a list and the default is empty (022/D1)", async () => {
    p = new Project();
    expect(loadConfig(p.root).gate.markdown).toEqual([]);
    p.write("spec-ctx.toml", '[gate]\nmarkdown = ["docs/*.md"]\n');
    expect(loadConfig(p.root).gate.markdown).toEqual(["docs/*.md"]);
    // a project without the key lints no file
    p.write("spec-ctx.toml", "");
    process.env.SPECCTX_OPENSPEC = "/bin/true";
    const r = await p.run("gate");
    delete process.env.SPECCTX_OPENSPEC;
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain("linters: ok (0 file(s))\n");
    // init writes the empty list with a comment that says how to turn the lint on
    p.cleanup();
    p = new Project(null);
    process.env.SPECCTX_OPENSPEC = "npx -y @fission-ai/openspec@latest";
    expect((await p.run("init")).code).toBe(0);
    delete process.env.SPECCTX_OPENSPEC;
    const text = p.read("spec-ctx.toml");
    expect(text).toContain("\nmarkdown = []\n");
    const i = text.indexOf("\nmarkdown = []\n");
    const above = text.slice(0, i).split("\n").at(-1)!;
    expect(above.startsWith("#")).toBe(true);
    expect(text).toContain("spec-ctx repository");
  });

  test("SCN-DIST-002-9 gate.openspec is a string with the npx default (018/D1)", async () => {
    p = new Project();
    expect(loadConfig(p.root).gate.openspec).toBe("npx -y @fission-ai/openspec@latest");
    p.write("spec-ctx.toml", "[gate]\nopenspec = \"openspec\"\n");
    expect(loadConfig(p.root).gate.openspec).toBe("openspec");
    p.write("spec-ctx.toml", "[gate]\nopenspec = 3\n");
    const r = await p.run("status");
    expect(r.code).toBe(2);
    expect(r.err).toContain("gate.openspec");
    p.write("spec-ctx.toml", "[gate]\nopenspec = \"\"\n");
    expect((await p.run("status")).code).toBe(2);
  });

  test("the config changes what build scans", async () => {
    p = new Project();
    p.write("spec-ctx.toml", '[scan]\ncode = ["lib/**"]\n');
    p.write("lib/b.ts", "// " + "REQ-AAA-002\n");
    const idx = await p.build();
    const code = idx.entries.filter((e: { kind: string }) => e.kind === "code").map((e: { file: string }) => e.file);
    expect(code).toEqual(["lib/b.ts"]);
  });

  test("a bad value exits 2 with the key name", async () => {
    p = new Project();
    p.write("spec-ctx.toml", "[bundle]\nbudget = \"big\"\n");
    const r = await p.run("status");
    expect(r.code).toBe(2);
    expect(r.err).toContain("bundle.budget");
    p.write("spec-ctx.toml", "[scan\n");
    expect((await p.run("build")).code).toBe(2);
  });

  test("SCN-DIST-002-2 init writes a file with a comment above every key", async () => {
    p = new Project(null);
    // the default command, so the written file equals the defaults (022/D2)
    process.env.SPECCTX_OPENSPEC = "npx -y @fission-ai/openspec@latest";
    const r = await p.run("init");
    delete process.env.SPECCTX_OPENSPEC;
    expect(r.code).toBe(0);
    const lines = p.read("spec-ctx.toml").split("\n");
    let keys = 0;
    lines.forEach((l, i) => {
      if (/^[a-z_]+ = /.test(l)) {
        keys++;
        expect(lines[i - 1]!.startsWith("#"), l).toBe(true);
      }
    });
    expect(keys).toBe(17);
    // the written file parses to the defaults
    expect(loadConfig(p.root)).toEqual(defaults());
  });

  test("init keeps the file when it exists", async () => {
    p = new Project(null);
    p.write("spec-ctx.toml", "# mine\n");
    const r = await p.run("init");
    expect(r.code).toBe(0);
    expect(p.read("spec-ctx.toml")).toBe("# mine\n");
  });

  test("SCN-LOOP-003-1 the loop section defaults to 3 attempts and ask", () => {
    p = new Project();
    expect(loadConfig(p.root).loop).toEqual({ max_attempts: 3, archive: "ask" });
    p.write("spec-ctx.toml", "[loop]\nmax_attempts = 5\narchive = \"auto\"\n");
    expect(loadConfig(p.root).loop).toEqual({ max_attempts: 5, archive: "auto" });
  });

  test("SCN-LOOP-003-2 a bad max_attempts exits 2 with the key name", async () => {
    p = new Project();
    for (const v of ["0", "2.5", "\"3\"", "-1"]) {
      p.write("spec-ctx.toml", `[loop]\nmax_attempts = ${v}\n`);
      const r = await p.run("status");
      expect(r.code, v).toBe(2);
      expect(r.err, v).toContain("loop.max_attempts must be an integer of 1 or more");
    }
  });

  test("SCN-LOOP-003-3 a bad archive exits 2 with the key name", async () => {
    p = new Project();
    for (const v of ["\"yes\"", "1", "true"]) {
      p.write("spec-ctx.toml", `[loop]\narchive = ${v}\n`);
      const r = await p.run("status");
      expect(r.code, v).toBe(2);
      expect(r.err, v).toContain("loop.archive must be \"ask\" or \"auto\"");
    }
  });

  test("SCN-LOOP-003-4 SCN-DIST-002-11 init writes the loop section with a comment above each key", async () => {
    p = new Project(null);
    process.env.SPECCTX_OPENSPEC = "npx -y @fission-ai/openspec@latest";
    const r = await p.run("init");
    delete process.env.SPECCTX_OPENSPEC;
    expect(r.code).toBe(0);
    const text = p.read("spec-ctx.toml");
    const lines = text.split("\n");
    const section = lines.indexOf("[loop]");
    expect(section).toBeGreaterThan(0);
    for (const key of ["max_attempts = 3", "archive = \"ask\""]) {
      const i = lines.indexOf(key);
      expect(i, key).toBeGreaterThan(section);
      expect(lines[i - 1]!.startsWith("#"), key).toBe(true);
    }
    expect(loadConfig(p.root).loop).toEqual({ max_attempts: 3, archive: "ask" });
    expect(loadConfig(p.root)).toEqual(defaults());
  });
});
