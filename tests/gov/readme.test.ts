// Covers: REQ-GOV-006
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { REPO } from "../helpers.ts";

const readme = readFileSync(join(REPO, "README.md"), "utf8");

describe("README order", () => {
  test("SCN-GOV-006-1 line 3 is a short tagline with Verify, and the story headers come first", () => {
    const lines = readme.split("\n");
    expect(lines[0]).toBe("# spec-ctx");
    const tagline = lines[2]!;
    expect(tagline.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(20);
    expect(tagline).toContain("Verify");
    expect(lines[4]).toMatch(/^For teams that run /);
    let at = -1;
    for (const h of ["## The problem", "## What spec-ctx does", "## Demo", "## Quickstart"]) {
      const i = lines.indexOf(h);
      expect(i, h).toBeGreaterThan(at);
      expect(i, h).toBeLessThan(60);
      at = i;
    }
    const problem = lines.slice(lines.indexOf("## The problem"), lines.indexOf("## What spec-ctx does"));
    expect(problem.filter((l) => l.startsWith("- "))).toHaveLength(3);
    const table = lines.slice(lines.indexOf("## What spec-ctx does"), lines.indexOf("## Demo")).filter((l) => l.startsWith("| "));
    expect(table[0]).toBe("| Without | With spec-ctx |");
    expect(table).toHaveLength(5);
    const quick = lines.slice(lines.indexOf("## Quickstart")).filter((l) => /^npx -y spec-ctx /.test(l));
    expect(quick.length).toBeGreaterThanOrEqual(3);
  });

  test("SCN-GOV-006-2 maintainer content lives in docs/CONTRIBUTING.md", () => {
    expect(readme.match(/^## Develop/gm)).toBeNull();
    const contrib = readFileSync(join(REPO, "docs/CONTRIBUTING.md"), "utf8");
    for (const h of ["## Develop", "## Layout", "## IDs", "## Gate steps"]) expect(contrib).toContain(`\n${h}\n`);
    expect(readme).toContain("`SPECCTX_OPENSPEC`");
  });

  test("SCN-GOV-006-3 Measured cites the newest metrics file and its total row, and no metric comes before it", () => {
    const lines = readme.split("\n");
    const at = lines.indexOf("## Measured");
    expect(at).toBeGreaterThan(0);
    expect(lines.indexOf("## Contribute")).toBeGreaterThan(at);
    const before = lines.slice(0, at);
    expect(before.filter((l) => l.includes("docs/metrics/"))).toEqual([]);
    expect(before.filter((l) => /\b0\.\d{2,}\b/.test(l))).toEqual([]);
    const section = lines.slice(at, lines.indexOf("## Contribute"));
    const newest = readdirSync(join(REPO, "docs/metrics")).filter((n) => /^\d{4}-\d{2}-\d{2}\.md$/.test(n)).sort().pop()!;
    expect(section.join("\n")).toContain(`\`docs/metrics/${newest}\``);
    const total = readFileSync(join(REPO, "docs/metrics", newest), "utf8").split("\n").find((l) => l.startsWith("| total |"))!;
    expect(section).toContain(total);
    for (const col of ["context_ratio", "evidence_ratio", "stale_catches", "cycle_time_median_s", "debt"]) {
      expect(section.some((l) => l.startsWith(`- \`${col}\`: `)), col).toBe(true);
    }
  });
});
