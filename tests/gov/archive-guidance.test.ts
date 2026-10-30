// Covers: REQ-GOV-009
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { REPO } from "../helpers.ts";

/** The lines under operations.archive.guidance in openspec/config.yaml, without the YAML quotes. */
function guidance(): string[] {
  const text = readFileSync(join(REPO, "openspec/config.yaml"), "utf8");
  const start = text.indexOf("\n  archive:\n    guidance:\n");
  expect(start).toBeGreaterThan(0);
  const out: string[] = [];
  for (const line of text.slice(start).split("\n").slice(3)) {
    const m = /^ {6}- '(.*)'$/.exec(line);
    if (!m) break;
    out.push(m[1]!.replaceAll("''", "'"));
  }
  return out;
}

describe("archive guidance of this repository", () => {
  test("SCN-GOV-009-1 the guidance names every pre-archive step and keeps the old lines", () => {
    const g = guidance();
    const has = (s: string): boolean => g.some((l) => l.includes(s));
    for (const step of [
      "`node dist/cli.js stats --write`",
      "`## Measured`",
      "`docs/metrics/`",
      "`Archived:`",
      "`## Unreleased`",
      "CHANGELOG.md",
      "`docs/verification/<NNN>.md`",
      "`bun run ci:local`",
    ]) expect(has(step), step).toBe(true);
    // the three lines from before 030 stay
    expect(has("check --strict")).toBe(true);
    expect(has("Rebuild the index")).toBe(true);
    expect(g.some((l) => l.includes("Rebuild the index") && l.includes("`node dist/cli.js build`"))).toBe(true);
    expect(g.filter((l) => l.includes("openspec validate --all --strict")).length).toBe(2);
    expect(g.length).toBe(9);
  });
});
