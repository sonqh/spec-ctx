// Covers: REQ-LINT-001, REQ-LINT-002
import { describe, expect, test } from "vitest";
import { lintTells, TELLS_IDS, TELLS_RULES } from "../../src/lint/tells.ts";

// One line that the rule flags and one that it does not. The lines come from the
// Python selftest where it has one. The rest were checked against scripts/tells-lint.py.
const CASES: Record<string, { hit: string; miss: string }> = {
  dash: { hit: "The policy — announced today — applies.", miss: "The tool shows your habits." },
  "not-x-but-y": { hit: "This is not a tool but a mirror.", miss: "The request may have failed." },
  "not-x-its-y": { hit: "It's not just a tool, it's a mirror.", miss: "The request may have failed." },
  "chat-residue": { hit: "Great question!", miss: "Check the client version." },
  "run-up": { hit: "Let's dive in.", miss: "Check the client version." },
  "deep-saying": { hit: "At its core it is robust and seamless.", miss: "The tool shows your habits." },
  "stock-word": { hit: "At its core it is robust and seamless.", miss: "The tool shows your habits." },
  "bold-label": { hit: "- **Speed:** fast", miss: "- Speed: fast" },
  "emoji-heading": { hit: "## 🚀 Launch", miss: "## Launch" },
  "sales-word": { hit: "A stunning view.", miss: "The tool shows your habits." },
  "title-case-heading": { hit: "# Title Case Heading Here", miss: "# Title case heading" },
  "stacked-qualifier": { hit: "It could potentially be slow.", miss: "The request may have failed." },
  "serves-as": { hit: "The file serves as the index.", miss: "The file is the index." },
  closer: { hit: "That is the real win.", miss: "That is the plan." },
  "repeated-closer": { hit: "Read on.\n\nRead on.\n", miss: "Read on.\n\nStop here.\n" },
};

const rules = (text: string): string[] => lintTells(text).map((f) => f.rule);

describe("tells rules", () => {
  for (const [id, c] of Object.entries(CASES)) {
    test(`rule ${id}`, () => {
      expect(rules(c.hit)).toContain(id);
      expect(rules(c.miss)).not.toContain(id);
    });
  }

  test("SCN-LINT-002-1 every rule ID has a test", () => {
    expect(Object.keys(CASES).sort()).toEqual([...TELLS_IDS].sort());
    for (const r of TELLS_RULES) expect(Object.keys(r).sort()).toEqual(["id", "level", "message", "pattern"]);
  });

  test("the selftest text gives the Python findings in order", () => {
    const bad = "It's not just a tool, it's a mirror. The policy — announced today — applies. Great question! Let's dive in. At its core it is robust and seamless.\n- **Speed:** fast\n";
    expect(lintTells(bad).map((f) => `${f.line} ${f.rule} ${f.match}`)).toEqual([
      "1 chat-residue Great question",
      "1 dash —",
      "1 dash —",
      "1 deep-saying At its core",
      "1 not-x-its-y It's not just a tool, it's",
      "1 run-up Let's dive in",
      "1 stock-word seamless",
      "2 bold-label - **Speed:**",
    ]);
  });

  test("code and URLs are not linted, and a disabled rule is silent", () => {
    expect(rules("Run `delve` at https://x.y/crucial.\n\n```\nseamless\n```\n")).toEqual([]);
    expect(lintTells("A seamless tool.", new Set(["stock-word"]))).toEqual([]);
  });
});
