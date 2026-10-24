// Covers: REQ-CLI-001
import { describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

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
