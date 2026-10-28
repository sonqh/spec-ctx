// Covers: REQ-SCH-003
import { describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";
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

describe("SCN-SCH-003-7 the apply guidance of the fragment", () => {
  const frag = readFileSync(join(REPO, FILES[0]!), "utf8");
  test("names task done, forbids the checkbox edit and /opsx:apply, and drops mark complete", () => {
    expect(frag).toContain("- 'Close each task only with `specctx task done <id>`. Never edit a checkbox. Never run `/opsx:apply`; run the `specctx-run` skill.'");
    expect(frag).not.toContain("mark complete");
    expect(frag).toContain("openspec/templates/spec-driven-ids/");
  });
  test("the bundle has no schema.yaml and keeps the four templates", () => {
    expect(existsSync(join(REPO, "schemas/spec-driven-ids/schema.yaml"))).toBe(false);
    for (const n of ["proposal.md", "design.md", "spec.md", "tasks.md"]) expect(existsSync(join(REPO, "schemas/spec-driven-ids/templates", n)), n).toBe(true);
  });
});

describe("SCN-SCH-003-2 Items are strings", () => {
  for (const f of FILES) {
    test(`${f}: every list item is a quoted scalar`, () => {
      const lines = items(readFileSync(join(REPO, f), "utf8"));
      expect(lines.length).toBeGreaterThan(0);
      for (const l of lines) expect(l, l).toMatch(/^\s+- ('.*'|".*")$/);
    });
  }

  test("project config names the stock schema and the built CLI (025/D8)", () => {
    const t = readFileSync(join(REPO, "openspec/config.yaml"), "utf8");
    expect(t).toMatch(/^schema: spec-driven$/m);
    expect(t).toContain("Never edit a checkbox.");
    expect(t).not.toContain("`ctx check");
  });
});
