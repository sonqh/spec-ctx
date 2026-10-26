// Covers: REQ-SCH-003
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "../helpers.ts";

const FILES = ["schemas/spec-driven-ids/config-fragment.yaml", "openspec/config.yaml"];

/** List lines under the rules and operations keys. Text based, the engine has no YAML parser. */
function items(text: string): string[] {
  const out: string[] = [];
  let inBlock = false;
  for (const line of text.split("\n")) {
    const top = /^([A-Za-z_][\w-]*):/.exec(line);
    if (top) inBlock = top[1] === "rules" || top[1] === "operations";
    else if (inBlock && /^\s+- /.test(line)) out.push(line);
  }
  return out;
}

describe("SCN-SCH-003-2 Items are strings", () => {
  for (const f of FILES) {
    test(`${f}: every list item is a quoted scalar`, () => {
      const lines = items(readFileSync(join(REPO, f), "utf8"));
      expect(lines.length).toBeGreaterThan(0);
      for (const l of lines) expect(l, l).toMatch(/^\s+- ('.*'|".*")$/);
    });
  }

  test("project config names the bundle and the built CLI", () => {
    const t = readFileSync(join(REPO, "openspec/config.yaml"), "utf8");
    expect(t).toMatch(/^schema: spec-driven-ids$/m);
    expect(t).not.toContain("`ctx check");
  });
});
