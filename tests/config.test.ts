// Covers: REQ-DIST-002
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
    const r = await p.run("init");
    expect(r.code).toBe(0);
    const lines = p.read("spec-ctx.toml").split("\n");
    let keys = 0;
    lines.forEach((l, i) => {
      if (/^[a-z_]+ = /.test(l)) {
        keys++;
        expect(lines[i - 1]!.startsWith("#"), l).toBe(true);
      }
    });
    expect(keys).toBe(11);
    // the written file parses to the defaults
    expect(loadConfig(p.root)).toEqual(defaults());
  });

  test("init exits 2 when the file exists", async () => {
    p = new Project(null);
    p.write("spec-ctx.toml", "# mine\n");
    const r = await p.run("init");
    expect(r.code).toBe(2);
    expect(p.read("spec-ctx.toml")).toBe("# mine\n");
  });
});
