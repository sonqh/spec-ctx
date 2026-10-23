// Covers: REQ-SKL-001
import { describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "../helpers.ts";

const SKILLS = ["specctx-bootstrap", "specctx-next", "specctx-done"];
const file = (s: string): string => join(REPO, "skills", s, "SKILL.md");

describe("skills", () => {
  test("the three skills exist and nothing else", () => {
    expect(readdirSync(join(REPO, "skills")).sort()).toEqual([...SKILLS].sort());
    for (const s of SKILLS) {
      const text = readFileSync(file(s), "utf8");
      expect(text.startsWith(`---\nname: ${s}\ndescription: `)).toBe(true);
    }
  });

  test("SCN-SKL-001-1 every SKILL.md is under 60 lines", () => {
    for (const s of SKILLS) {
      const lines = readFileSync(file(s), "utf8").split("\n").length - 1;
      expect(lines, s).toBeLessThan(60);
    }
  });

  test("SCN-SKL-001-2 both linters pass with baseline 0", () => {
    for (const s of SKILLS) {
      const t = spawnSync("python3", [join(REPO, "scripts/tells-lint.py"), "--baseline", "0", file(s)], { encoding: "utf8" });
      expect(t.status, t.stdout).toBe(0);
      const ste = spawnSync("python3", [join(REPO, "scripts/ste-lint.py"), "--baseline", "0", "--disable", "synonym-rotation", file(s)], { encoding: "utf8" });
      expect(ste.status, ste.stdout).toBe(0);
    }
  });

  test("each skill names its exact commands", () => {
    const need: Record<string, string[]> = {
      "specctx-bootstrap": ["specctx status", ".ctx/handoff.md", "specctx task next", "specctx task start <task>"],
      "specctx-next": ["specctx task next", "specctx task start <task>"],
      "specctx-done": ["specctx task done <task>", "specctx handoff write"],
    };
    for (const [s, cmds] of Object.entries(need)) {
      const text = readFileSync(file(s), "utf8");
      for (const c of cmds) expect(text, `${s}: ${c}`).toContain(c);
    }
  });
});
