// Covers: REQ-GOV-006
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { REPO } from "../helpers.ts";

const readme = readFileSync(join(REPO, "README.md"), "utf8");

describe("README order", () => {
  test("SCN-GOV-006-1 the first 25 lines hold the value sentence, the quickstart, and the excerpt, and no SVG", () => {
    const head = readme.split("\n").slice(0, 25);
    expect(head[0]).toBe("# spec-ctx");
    expect(head.some((l) => /context ratio of \d\.\d+ \(`docs\/metrics\/\d{4}-\d{2}-\d{2}\.md`\)/.test(l))).toBe(true);
    const quick = head.filter((l) => /^npx -y spec-ctx /.test(l));
    expect(quick).toHaveLength(3);
    const start = head.indexOf("$ specctx task start add-mfa/1.3");
    expect(start).toBeGreaterThan(0);
    const end = head.indexOf("```", start);
    expect(end - start).toBeLessThanOrEqual(12);
    expect(head.some((l) => l.includes(".svg"))).toBe(false);
  });

  test("SCN-GOV-006-2 maintainer content lives in docs/CONTRIBUTING.md", () => {
    expect(readme.match(/^## Develop/gm)).toBeNull();
    const contrib = readFileSync(join(REPO, "docs/CONTRIBUTING.md"), "utf8");
    for (const h of ["## Develop", "## Layout", "## IDs", "## Gate steps"]) expect(contrib).toContain(`\n${h}\n`);
    expect(readme).toContain("`SPECCTX_OPENSPEC`");
  });

  test("SCN-GOV-006-3 the value sentence names Verify before the context ratio and cites the newest metrics file", () => {
    const sentence = readme.split("\n")[2]!;
    const verify = sentence.indexOf("Verify");
    const ratio = sentence.indexOf("context ratio");
    expect(verify).toBeGreaterThan(-1);
    expect(ratio).toBeGreaterThan(verify);
    const newest = readdirSync(join(REPO, "docs/metrics")).filter((n) => /^\d{4}-\d{2}-\d{2}\.md$/.test(n)).sort().pop()!;
    expect(sentence).toContain(`(\`docs/metrics/${newest}\`)`);
  });

  test("REQ-GOV-006 a Why list of three lines follows the excerpt", () => {
    const lines = readme.split("\n");
    const at = lines.indexOf("## Why");
    expect(at).toBeGreaterThan(lines.indexOf("$ specctx task start add-mfa/1.3"));
    const items: string[] = [];
    for (const l of lines.slice(at + 1)) {
      if (l.startsWith("## ")) break;
      if (l.startsWith("- ")) items.push(l);
    }
    expect(items).toHaveLength(3);
    for (const l of items) expect(l).toMatch(/\d/);
  });
});
