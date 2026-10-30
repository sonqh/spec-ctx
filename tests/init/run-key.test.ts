// Covers: REQ-DIST-015, REQ-CLI-010
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { loadConfig } from "../../src/config.ts";
import { runPrefixFor } from "../../src/init/init.ts";
import { VERSION } from "../../src/version.ts";
import { Project, REPO } from "../helpers.ts";

let p: Project;
afterEach(() => {
  p?.cleanup();
  delete process.env.SPECCTX_OPENSPEC;
});

function fresh(npm: string | null): Project {
  const pr = new Project(null);
  pr.write("openspec/config.yaml", "schema: spec-driven\n");
  pr.npmCommand = npm;
  return pr;
}

const WANT = `npx -y spec-ctx@${VERSION}`;

describe("init writes [cli] run under npx", () => {
  test("runPrefixFor reads npm_command only", () => {
    expect(runPrefixFor({ npm_command: "exec" })).toBe(WANT);
    expect(runPrefixFor({ npm_command: "run-script" })).toBeNull();
    expect(runPrefixFor({ npm_command: "install" })).toBeNull();
    expect(runPrefixFor({})).toBeNull();
  });

  test("SCN-DIST-015-1 exec writes the key, loadConfig reads it, and the next line uses it", async () => {
    p = fresh("exec");
    p.write("src/x.ts", "");
    const r = await p.run("init", "--all");
    expect(r.code).toBe(0);
    const text = p.read("spec-ctx.toml");
    expect(text).toContain(`\n[cli]\n# `);
    expect(text).toContain(`\nrun = "${WANT}"\n`);
    expect(loadConfig(p.root).cli.run).toBe(WANT);
    expect(r.out.trimEnd().split("\n").at(-1)).toBe(`next: ${WANT} status`);
  });

  test("SCN-DIST-015-2 run-script and unset write no [cli] section", async () => {
    for (const v of ["run-script", null]) {
      p = fresh(v);
      expect((await p.run("init")).code).toBe(0);
      expect(p.read("spec-ctx.toml")).not.toContain("[cli]");
      expect(loadConfig(p.root).cli.run).toBe("specctx");
      p.cleanup();
    }
    p = fresh(null);
  });

  test("SCN-DIST-015-3 an existing key stays with --force and the next line uses it", async () => {
    p = fresh("exec");
    const mine = '[cli]\nrun = "bunx spec-ctx"\n';
    p.write("spec-ctx.toml", mine);
    const r = await p.run("init", "--all", "--force");
    expect(r.code).toBe(0);
    expect(p.read("spec-ctx.toml")).toBe(mine);
    expect(r.out.trimEnd().split("\n").at(-1)).toBe("next: bunx spec-ctx status");
  });

  test("SCN-DIST-015-1 the built CLI under npm_command=exec writes the key", () => {
    p = fresh(null);
    const env: NodeJS.ProcessEnv = { ...process.env, npm_command: "exec", SPECCTX_OPENSPEC: "/bin/true", HOME: p.root };
    delete env.SPECCTX_RERUN;
    const r = spawnSync(process.execPath, [join(REPO, "dist/cli.js"), "init", "--root", p.root], { encoding: "utf8", env });
    expect(r.status, r.stderr).toBe(0);
    expect(p.read("spec-ctx.toml")).toContain(`\nrun = "${WANT}"\n`);
    expect(r.stdout).toContain(`next: ${WANT} status`);
  });
});
