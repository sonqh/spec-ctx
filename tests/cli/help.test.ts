// Covers: REQ-CLI-001, REQ-CLI-006
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { COMMANDS } from "../../src/cli/args.ts";
import { commandPage, HELP, TABLE } from "../../src/cli/help.ts";
import { lintSte } from "../../src/lint/ste.ts";
import { Project, REPO } from "../helpers.ts";

// The help golden. SPECCTX_HELP_RECORD=1 rewrites it. A new record needs a note in the verification record.
const GOLDEN = join(REPO, "tests/fixtures/help-golden");

function section(help: string, name: string): string[] {
  const lines = help.split("\n");
  const start = lines.indexOf(`${name}:`);
  const end = lines.findIndex((l, i) => i > start && /^\S/.test(l) && l.endsWith(":"));
  return lines.slice(start + 1, end < 0 ? undefined : end);
}

describe("help", () => {
  test("SCN-CLI-001-5 adopt, baseline, and backfill appear under Setup", async () => {
    const p = new Project(null);
    try {
      const help = (await p.run("--help")).out;
      const setup = section(help, "Setup");
      for (const c of ["adopt", "baseline write", "baseline prune", "task backfill"]) {
        expect(setup.some((l) => l.startsWith(`  \`${c}`)), c).toBe(true);
      }
      for (const c of ["adopt", "baseline write", "baseline prune", "task backfill"]) {
        expect(section(help, "Read").some((l) => l.startsWith(`  \`${c}`)), c).toBe(false);
      }
    } finally {
      p.cleanup();
    }
  });

  test("a bare baseline needs a subcommand", async () => {
    const p = new Project();
    try {
      const r = await p.run("baseline");
      expect(r.code).toBe(2);
      expect(r.err).toContain("baseline needs a subcommand: write, prune");
    } finally {
      p.cleanup();
    }
  });
});

const pages = (): string => TABLE.map((c) => `== ${c.name}\n${commandPage(c)}`).join("\n");

describe("per command help", () => {
  test("the help golden matches", () => {
    if (process.env.SPECCTX_HELP_RECORD === "1" || !existsSync(join(GOLDEN, "help.out"))) {
      mkdirSync(GOLDEN, { recursive: true });
      writeFileSync(join(GOLDEN, "help.out"), HELP);
      writeFileSync(join(GOLDEN, "pages.out"), pages());
    }
    expect(HELP).toBe(readFileSync(join(GOLDEN, "help.out"), "utf8"));
    expect(pages()).toBe(readFileSync(join(GOLDEN, "pages.out"), "utf8"));
  });

  test("every command has one record, and every record names a command", () => {
    const names = TABLE.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    for (const c of COMMANDS) expect(names, c).toContain(c);
    for (const n of names) expect([...COMMANDS, "lint tells", "lint ste", "help"], n).toContain(n);
  });

  test("SCN-CLI-006-1 task start --help prints that page only", async () => {
    const p = new Project(null);
    try {
      const r = await p.run("task", "start", "--help");
      expect(r.code).toBe(0);
      expect(r.out).toContain("`specctx task start <task> [flags]`");
      expect(r.out.split("\n").some((l) => l.includes("adopt"))).toBe(false);
      expect((await p.run("help", "task", "start")).out).toBe(r.out);
      expect((await p.run("id", "new", "--help")).out).toContain("`specctx id new <kind> <code> [flags]`");
    } finally {
      p.cleanup();
    }
  });

  test("SCN-CLI-006-2 lint pages and command pages share the sections in order", async () => {
    const p = new Project(null);
    try {
      for (const args of [["lint", "tells", "--help"], ["lint", "ste", "--help"], ["status", "--help"]]) {
        const r = await p.run(...args);
        expect(r.code, args.join(" ")).toBe(0);
        const lines = r.out.split("\n");
        const at = ["Usage:", "Flags:", "Exit codes:", "Example:"].map((h) => lines.indexOf(h));
        expect(at.every((i) => i > 0), args.join(" ")).toBe(true);
        expect([...at].sort((a, b) => a - b)).toEqual(at);
      }
    } finally {
      p.cleanup();
    }
  });

  test("SCN-CLI-006-3 the unknown command list names help and lint", async () => {
    const p = new Project(null);
    try {
      const r = await p.run("frobnicate");
      expect(r.code).toBe(2);
      const list = r.err.split("\n").find((l) => l.startsWith("commands: "))!.slice("commands: ".length).split(", ");
      expect(list).toContain("help");
      expect(list).toContain("lint");
      const h = await p.run("help", "frobnicate");
      expect(h.code).toBe(2);
      expect(h.err).toContain("commands: ");
    } finally {
      p.cleanup();
    }
  });

  test("every page passes lint ste with baseline 0", () => {
    for (const text of [HELP, ...TABLE.map(commandPage)]) {
      const hard = lintSte(text).findings.filter((f) => f.level === "advisory-free");
      expect(hard, text.split("\n")[0]).toEqual([]);
    }
  });
});
