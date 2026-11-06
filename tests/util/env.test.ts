// Covers: REQ-DIST-016, SCN-DIST-016-5
import { describe, expect, test } from "vitest";
import { childEnv, NESTED_NPX_VARS } from "../../src/util/env.ts";

describe("childEnv", () => {
  test("SCN-DIST-016-5 drops the two variables, keeps the rest, leaves the input alone", () => {
    const input: NodeJS.ProcessEnv = {
      npm_config_package: "@fission-ai/openspec@1.0.0",
      npm_config_call: "specctx gate",
      npm_command: "exec",
      PATH: "/usr/bin",
    };
    const out = childEnv(input);
    for (const k of NESTED_NPX_VARS) expect(k in out).toBe(false);
    expect(out.npm_command).toBe("exec");
    expect(out.PATH).toBe("/usr/bin");
    expect(Object.keys(input).sort()).toEqual(["PATH", "npm_command", "npm_config_call", "npm_config_package"]);
    expect(input.npm_config_package).toBe("@fission-ai/openspec@1.0.0");
    expect(out).not.toBe(input);
  });
});
