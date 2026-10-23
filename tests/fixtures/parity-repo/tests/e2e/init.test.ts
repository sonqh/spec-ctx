import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ROOT, cleanup, preparedHome, walk } from "../helpers.ts";

// Covers: REQ-APPLY-001, REQ-APPLY-005, REQ-APPLY-007
describe("e2e: init, status, revert through the built bin", () => {
  let home: string;
  beforeAll(() => {
    execFileSync("npx", ["tsc", "-p", "tsconfig.build.json"], { cwd: ROOT });
    home = preparedHome("valid-senior-ts.yaml", [".claude", ".codex"]);
  });
  afterAll(() => cleanup(home));

  const run = (...args: string[]) =>
    spawnSync(process.execPath, [join(ROOT, "bin/agentrc.js"), ...args], {
      env: { HOME: home, PATH: process.env.PATH ?? "" },
      encoding: "utf8",
      input: "",
    });

  // Covers: REQ-CLI-001
  it("the built bin prints its version", () => {
    expect(run("--version").stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("init --yes, status, and revert all exit 0 and revert leaves the home as it was", () => {
    const before = walk(home);
    const init = run("init", "--yes", "--no-elicit");
    expect(init.status, init.stderr).toBe(0);
    expect(walk(home)).toContain(".claude/CLAUDE.md");
    expect(walk(home)).toContain(".codex/AGENTS.md");
    const status = run("status");
    expect(status.status, status.stdout + status.stderr).toBe(0);
    const revert = run("revert");
    expect(revert.status, revert.stderr).toBe(0);
    expect(walk(home)).toEqual(before);
  });
});
