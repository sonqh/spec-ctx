// Covers: REQ-GOV-006
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { REPO } from "../helpers.ts";

const readme = readFileSync(join(REPO, "README.md"), "utf8");

describe("README order", () => {
  test("SCN-GOV-006-1 line 3 is a short tagline with IDs, and the story headers come first", () => {
    const lines = readme.split("\n");
    expect(lines[0]).toBe("# spec-ctx");
    const tagline = lines[2]!;
    expect(tagline.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(25);
    expect(tagline).toContain("IDs");
    expect(lines[4]).toMatch(/^For teams that run /);
    let at = -1;
    for (const h of ["## What OpenSpec is", "## The problem", "## What spec-ctx adds", "## See it work", "## Quickstart", "## How it finds the context", "## The life cycle for agents"]) {
      const i = lines.indexOf(h);
      expect(i, h).toBeGreaterThan(at);
      at = i;
    }
    expect(lines.indexOf("## Demo")).toBe(-1);
    // one paragraph says what OpenSpec is
    const openspec = lines.slice(lines.indexOf("## What OpenSpec is") + 1, lines.indexOf("## The problem")).filter((l) => l.trim());
    expect(openspec).toHaveLength(1);
    expect(openspec[0]).toMatch(/^\[OpenSpec\]\(https:\/\/github\.com\/Fission-AI\/OpenSpec\) is a folder named `openspec\/`/);
    const problem = lines.slice(lines.indexOf("## The problem"), lines.indexOf("## What spec-ctx adds"));
    expect(problem.filter((l) => l.startsWith("- "))).toHaveLength(3);
    const table = lines.slice(lines.indexOf("## What spec-ctx adds"), lines.indexOf("## See it work")).filter((l) => l.startsWith("| "));
    expect(table[0]).toBe("| Without | With spec-ctx |");
    expect(table).toHaveLength(6);
    // the Verify gate is the last row
    expect(table[5]).toContain("Verify");
    expect(table.slice(2, 5).some((l) => l.includes("Verify"))).toBe(false);
    const quick = lines.slice(lines.indexOf("## Quickstart")).filter((l) => /^npx -y spec-ctx /.test(l));
    expect(quick.length).toBeGreaterThanOrEqual(3);
  });

  test("SCN-GOV-006-5 See it work holds six numbered steps, each with its SVG clip between two paragraphs", () => {
    const lines = readme.split("\n");
    const from = lines.indexOf("## See it work");
    const to = lines.indexOf("## Quickstart");
    let at = from;
    for (let n = 1; n <= 6; n++) {
      const i = lines.findIndex((l, k) => k > at && k < to && l.startsWith(`### ${n}. `));
      expect(i, `### ${n}.`).toBeGreaterThan(at);
      const near = lines.slice(i + 1, i + 5);
      const img = near.findIndex((l) => new RegExp(`^!\\[[^\\]]+\\]\\(https://raw\\.githubusercontent\\.com/sonqh/spec-ctx/main/docs/demo/clips/${n}-[a-z]+\\.svg\\)$`).test(l));
      expect(img, `clip ${n}`).toBeGreaterThan(0);
      // a paragraph before the clip and one after it
      expect(near.slice(0, img).some((l) => l.trim() !== "")).toBe(true);
      const next = lines.findIndex((l, k) => k > i + 1 + img && (l.startsWith("### ") || l.startsWith("## ")));
      expect(lines.slice(i + 2 + img, next).some((l) => l.startsWith("You see: "))).toBe(true);
      at = i;
    }
  });

  test("SCN-GOV-006-4 the graph section holds a mermaid block, and the life cycle names the skills and the handoff", () => {
    const lines = readme.split("\n");
    const g = lines.indexOf("## How it finds the context");
    const l = lines.indexOf("## The life cycle for agents");
    const graph = lines.slice(g, l).join("\n");
    const mermaid = /```mermaid\n([\s\S]*?)```/.exec(graph);
    expect(mermaid).not.toBeNull();
    expect(mermaid![1]).toMatch(/^graph LR/);
    for (const w of ["REQ-UA-004", "Covers", "SCN-UA-004-1", "SCN-UA-004-2", "add-mfa/1.3"]) expect(mermaid![1]).toContain(w);
    expect(graph).toContain("$ specctx related REQ-UA-004");
    const next = lines.findIndex((x, k) => k > l && x.startsWith("## "));
    const cycle = lines.slice(l, next).join("\n");
    for (const w of ["specctx-bootstrap", "specctx-next", "specctx-done", "handoff write"]) expect(cycle).toContain(w);
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
