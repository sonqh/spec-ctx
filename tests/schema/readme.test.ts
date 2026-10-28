// Covers: REQ-SCH-004
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "../helpers.ts";

describe("SCN-SCH-004-1 Both paths", () => {
  const text = readFileSync(join(REPO, "schemas/spec-driven-ids/README.md"), "utf8");
  const heads = text.split("\n").filter((l) => l.startsWith("#"));
  const at = (word: string): number => heads.findIndex((h) => h.toLowerCase().includes(word));

  test("the copy heading comes before the init --schema heading", () => {
    expect(at("copy")).toBeGreaterThanOrEqual(0);
    expect(at("init --schema")).toBeGreaterThan(at("copy"));
  });

  test("the README names the OpenSpec version the templates come from", () => {
    expect(text).toContain("1.14.3");
  });

  test("the README names the templates path and the stock schema, and no schema.yaml (025/D3)", () => {
    expect(text).toContain("openspec/templates/spec-driven-ids/");
    expect(text).toContain("schema: spec-driven");
    expect(text).not.toContain("schema.yaml");
  });
});
