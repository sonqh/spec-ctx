// Covers: REQ-CLI-007
import { existsSync, readdirSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

let p: Project | undefined;
afterEach(() => {
  p?.cleanup();
  p = undefined;
});

const COMMANDS = [
  ["status"], ["build"], ["query", "x"], ["related", "REQ-AA-001"], ["bundle", "REQ-AA-001"], ["check"], ["check", "--strict"],
  ["gate"], ["stats"], ["adopt"], ["adopt", "--dry-run"], ["id", "new", "REQ", "AA"], ["task", "next"], ["task", "start", "001/1.1"],
  ["task", "done", "001/1.1"], ["handoff", "write"], ["handoff", "ask", "why"], ["baseline", "write"],
];

describe("project detection", () => {
  test("SCN-CLI-007-1 status in an empty folder exits 2 and writes nothing", async () => {
    p = new Project(null);
    const r = await p.run("status");
    expect(r.code).toBe(2);
    expect(r.err).toBe(`specctx: not an OpenSpec project (no openspec/ under ${p.root}). Run npx -y @fission-ai/openspec@latest init first.\n`);
    expect(existsSync(p.path(".ctx"))).toBe(false);
    expect(readdirSync(p.root)).toEqual([]);
  });

  test("SCN-CLI-007-1 every command but init, --help, and --version stops", async () => {
    p = new Project(null);
    for (const args of COMMANDS) {
      const r = await p.run(...args);
      expect(r.code, args.join(" ")).toBe(2);
      expect(r.err, args.join(" ")).toContain("not an OpenSpec project (no openspec/ under ");
    }
    expect(readdirSync(p.root)).toEqual([]);
    expect((await p.run("--help")).code).toBe(0);
    expect((await p.run("status", "--help")).code).toBe(0);
    expect((await p.run("--version")).code).toBe(0);
    expect(readdirSync(p.root)).toEqual([]);
  });

  test("a spec-ctx.toml without openspec/ is no project either", async () => {
    p = new Project(null);
    p.write("spec-ctx.toml", "[ids]\ncaps = []\n");
    const r = await p.run("status");
    expect(r.code).toBe(2);
    expect(r.err).toContain(`no openspec/ under ${p.root}`);
    expect(existsSync(p.path(".ctx"))).toBe(false);
  });

  test("init still runs in a folder without openspec/", async () => {
    p = new Project(null);
    const r = await p.run("init");
    expect(r.code).toBe(0);
    expect(existsSync(p.path("spec-ctx.toml"))).toBe(true);
  });
});
