// Covers: REQ-LINT-001, REQ-LINT-002
import { describe, expect, test } from "vitest";
import { lintSte, STE_IDS, STE_RULES } from "../../src/lint/ste.ts";
import { round1 } from "../../src/lint/py.ts";

const twenty = Array(20).fill("word").join(" ");
// One line that the rule flags and one that it does not, both from the Python selftest.
const CASES: Record<string, { hit: string; miss: string }> = {
  semicolon: { hit: "a; b", miss: "The request may have failed." },
  "phrasal-verb": { hit: "Run `make all` then spin up the node.", miss: "It could be a timeout." },
  "marketing-adjective": { hit: "Perform an analysis of the seamless log.", miss: "The task is gone." },
  nominalization: { hit: "Perform an analysis of the seamless log.", miss: "Check the config. Check the output." },
  "passive-voice": { hit: "The flag is set.", miss: "The task is gone." },
  "present-perfect": { hit: "The task has run.", miss: "The job may have run." },
  "long-sentence": { hit: Array(30).fill("word").join(" ") + ".", miss: `**Lead.** The ${twenty} more words here now.` },
  "synonym-rotation": { hit: "Check the config file. Then verify the output. Verify twice.", miss: "Check the config. Check the output." },
  "dangling-conjunction": { hit: "- Confirm the target and", miss: "- Use `and` as a label" },
};

const rules = (text: string): string[] => lintSte(text).findings.map((f) => f.rule);

describe("ste rules", () => {
  for (const [id, c] of Object.entries(CASES)) {
    test(`rule ${id}`, () => {
      expect(rules(c.hit)).toContain(id);
      expect(rules(c.miss)).not.toContain(id);
    });
  }

  test("SCN-LINT-002-1 every rule ID has a test", () => {
    expect(Object.keys(CASES).sort()).toEqual([...STE_IDS].sort());
    for (const r of STE_RULES) expect(Object.keys(r).sort()).toEqual(["id", "level", "message", "pattern"]);
  });

  // the expected columns came from scripts/ste-lint.py
  test("columns count code points, as Python does", () => {
    const f = lintSte("`😀😀` x; y").findings.find((x) => x.rule === "semicolon")!;
    expect(f.col).toBe(7);
    const t = lintSte("| 😀 a | b; c |\n| --- | --- |\n").findings.find((x) => x.rule === "semicolon")!;
    expect([t.line, t.col]).toEqual([1, 10]);
  });

  test("the rate rounds half to even, as Python round() does", () => {
    expect(round1(0.25)).toBe("0.2");
    expect(round1(0.35)).toBe("0.3");
    expect(round1(12.5)).toBe("12.5");
    expect(round1(100 / 3)).toBe("33.3");
    expect(round1(2)).toBe("2.0");
  });
});
