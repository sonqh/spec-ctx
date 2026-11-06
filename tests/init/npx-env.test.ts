// Covers: REQ-DIST-016, REQ-DIST-002, SCN-DIST-016-2
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { chmodSync } from "node:fs";
import { join } from "node:path";
import { cleanEnv, Project, REPO } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const CLI = join(REPO, "dist/cli.js");
// The fake npx exits 1 when the variable is set, even empty. Otherwise it prints a version.
const FAKE = '#!/bin/sh\nif [ "${npm_config_package+x}" = x ]; then exit 1; fi\necho 9.9.9\n';

describe("init under a nested npx", () => {
  test("SCN-DIST-016-2 the version probe does not see the two variables", () => {
    p = new Project(null);
    p.write("bin/npx", FAKE);
    chmodSync(p.path("bin/npx"), 0o755);
    const r = spawnSync(process.execPath, [CLI, "init", "--root", p.root], {
      encoding: "utf8",
      env: cleanEnv({
        npm_config_package: "@fission-ai/openspec@1.0.0",
        npm_config_call: "specctx init",
        PATH: `${p.path("bin")}:${process.env.PATH ?? ""}`,
        HOME: p.root,
      }),
    });
    expect(r.status, r.stdout).toBe(0);
    expect(p.read("spec-ctx.toml")).toContain('\nopenspec = "npx -y @fission-ai/openspec@9.9.9"\n');
    expect(r.stdout).not.toContain("note:");
  });
});
