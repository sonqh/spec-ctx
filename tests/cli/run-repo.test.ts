// Covers: REQ-CLI-010
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { loadConfig } from "../../src/config.ts";
import { OPENSPEC_STUB, Project, REPO } from "../helpers.ts";

beforeEach(() => {
  process.env.SPECCTX_OPENSPEC = OPENSPEC_STUB;
  delete process.env.SPECCTX_RERUN;
});
afterEach(() => {
  delete process.env.SPECCTX_OPENSPEC;
});

describe("this repository", () => {
  test("SCN-CLI-010-1 spec-ctx.toml sets the run prefix to node dist/cli.js", () => {
    expect(loadConfig(REPO).cli.run).toBe("node dist/cli.js");
  });

  test("SCN-CLI-010-2 status in a copy of the config prints a next line with that prefix", async () => {
    const p = new Project();
    try {
      p.write("spec-ctx.toml", `[cli]\nrun = "${loadConfig(REPO).cli.run}"\n`);
      const r = await p.run("status");
      expect(r.out.trimEnd().split("\n").at(-1)).toMatch(/^next: node dist\/cli\.js /);
    } finally {
      p.cleanup();
    }
  });
});
