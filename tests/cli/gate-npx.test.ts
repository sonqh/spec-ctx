// Covers: REQ-DIST-016, REQ-CLI-004, SCN-DIST-016-1
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { chmodSync } from "node:fs";
import { join } from "node:path";
import { cleanEnv, Project, REPO } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const CLI = join(REPO, "dist/cli.js");
// The stub tests for a set variable, even an empty one. It exits 1 when the variable is set.
const STUB = '#!/bin/sh\nif [ "${npm_config_package+x}" = x ]; then exit 1; fi\nexit 0\n';
const NESTED = { npm_config_package: "@fission-ai/openspec@1.0.0", npm_config_call: "specctx gate" };

describe("gate under a nested npx", () => {
  test("SCN-DIST-016-1 the validate step does not see the two variables", () => {
    p = new Project();
    p.write("osstub/openspec.sh", STUB);
    chmodSync(p.path("osstub/openspec.sh"), 0o755);
    const stub = p.path("osstub/openspec.sh");
    const r = spawnSync(process.execPath, [CLI, "gate", "--strict", "--root", p.root, "--markdown", "openspec/**/*.md decisions/*.md"], {
      encoding: "utf8",
      env: cleanEnv({ ...NESTED, SPECCTX_OPENSPEC: stub }),
    });
    expect(r.stdout).toContain("validate: ok (strict)");
    expect(r.status).toBe(0);
  });

  test("the stub exits 1 when it sees the variable", () => {
    p = new Project();
    p.write("osstub/openspec.sh", STUB);
    chmodSync(p.path("osstub/openspec.sh"), 0o755);
    const r = spawnSync(p.path("osstub/openspec.sh"), [], { env: cleanEnv(NESTED) });
    expect(r.status).toBe(1);
    const clean = spawnSync(p.path("osstub/openspec.sh"), [], { env: cleanEnv() });
    expect(clean.status).toBe(0);
  });
});
