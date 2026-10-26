// Covers: REQ-CLI-008
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { colorOn, paint } from "../../src/cli/color.ts";
import { Project, REPO } from "../helpers.ts";

const SPEC = "openspec/specs/alpha/spec.md";
const CLI = join(REPO, "dist/cli.js");
const ESC = "\x1b";
let p: Project;
afterEach(() => p?.cleanup());

/** Run the built CLI with stdout in a pipe and a clean color environment plus `extra`. */
function cli(cwd: string, args: string[], extra: Record<string, string> = {}): { code: number; out: string } {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.FORCE_COLOR;
  delete env.NO_COLOR;
  const r = spawnSync("node", [CLI, ...args], { cwd, env: { ...env, ...extra }, encoding: "utf8" });
  return { code: r.status ?? 3, out: r.stdout };
}

describe("color on a TTY", () => {
  test("SCN-CLI-008-1 check in a pipe holds no escape byte", () => {
    p = new Project();
    p.append(SPEC, "\nRefs: REQ-NOPE-001\n");
    const r = cli(p.root, ["check"]);
    expect(r.code).toBe(1);
    expect(r.out).toContain("dangling-ref");
    expect(r.out).not.toContain(ESC);
  });

  test("SCN-CLI-008-2 FORCE_COLOR paints the hard finding red and the summary dim", () => {
    p = new Project();
    p.append(SPEC, "\nRefs: REQ-NOPE-001\n");
    const r = cli(p.root, ["check", "--strict"], { FORCE_COLOR: "1" });
    expect(r.code).toBe(1);
    const lines = r.out.split("\n");
    const hit = lines.find((l) => l.includes("dangling-ref  REQ-NOPE-001"));
    expect(hit?.startsWith("\x1b[31m")).toBe(true);
    const summary = lines.find((l) => l.includes(" hard, "));
    expect(summary?.startsWith("\x1b[2m")).toBe(true);
    // --json never carries an escape code
    expect(cli(p.root, ["check", "--json"], { FORCE_COLOR: "1" }).out).not.toContain(ESC);
  });

  test("SCN-CLI-008-3 NO_COLOR wins over FORCE_COLOR", () => {
    p = new Project();
    const r = cli(p.root, ["status"], { FORCE_COLOR: "1", NO_COLOR: "1" });
    expect(r.out).toContain("uncovered active REQs");
    expect(r.out).not.toContain(ESC);
    expect(cli(p.root, ["status"], { FORCE_COLOR: "1" }).out).toContain("\x1b[2mnext: ");
  });

  test("colorOn reads the TTY flag, TERM, NO_COLOR, and FORCE_COLOR", () => {
    expect(colorOn(true, {})).toBe(true);
    expect(colorOn(false, {})).toBe(false);
    expect(colorOn(true, { TERM: "dumb" })).toBe(false);
    expect(colorOn(true, { NO_COLOR: "1" })).toBe(false);
    expect(colorOn(false, { FORCE_COLOR: "1" })).toBe(true);
    expect(colorOn(false, { FORCE_COLOR: "0" })).toBe(false);
    expect(colorOn(false, { FORCE_COLOR: "1", NO_COLOR: "1" })).toBe(false);
  });

  test("paint keeps the newline outside the codes", () => {
    const saved = { f: process.env.FORCE_COLOR, n: process.env.NO_COLOR };
    try {
      delete process.env.NO_COLOR;
      process.env.FORCE_COLOR = "1";
      expect(paint("ok", "done x\n", false)).toBe("\x1b[32mdone x\x1b[0m\n");
      delete process.env.FORCE_COLOR;
      expect(paint("ok", "done x\n", false)).toBe("done x\n");
    } finally {
      if (saved.f === undefined) delete process.env.FORCE_COLOR;
      else process.env.FORCE_COLOR = saved.f;
      if (saved.n !== undefined) process.env.NO_COLOR = saved.n;
    }
  });
});
