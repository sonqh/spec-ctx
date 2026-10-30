// Covers: REQ-SKL-005, REQ-SKL-006
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { ASSETS } from "../../src/assets.generated.ts";
import { REPO } from "../helpers.ts";

const text = readFileSync(join(REPO, "skills/specctx-run/SKILL.md"), "utf8");

describe("specctx-run overrides", () => {
  test("SCN-SKL-005-1 names the overrides of openspec-propose", () => {
    for (const s of ["overrides", "openspec-propose", "openspec show", "specctx bundle", "/opsx:apply"]) expect(text, s).toContain(s);
  });

  test("SCN-SKL-005-2 the gate bullet routes stale evidence to repair", () => {
    const bullet = text.split("\n").find((l) => l.startsWith("- `gate`"))!;
    for (const s of ["stale-evidence", "step 1", "repair"]) expect(bullet, s).toContain(s);
  });

  test("SCN-SKL-005-3 the packaged copy equals the file", () => {
    const packed = Buffer.from(ASSETS["skills/specctx-run/SKILL.md"]!, "base64").toString("utf8");
    expect(packed).toBe(text);
  });

  test("SCN-SKL-006-1 the block rule names --block and the scenario titles", () => {
    const rule = text.split("\n").find((l) => l.includes("--block"))!;
    expect(rule).toContain("specctx bundle <REQ> --block");
    expect(rule).toContain("MODIFIED block keeps every scenario title unchanged");
  });

  test("SCN-SKL-006-2 the skill and the drift test name the refresh command", () => {
    const cmd = "bun run build && node dist/cli.js init --skills --force";
    expect(text).toContain(cmd);
    expect(readFileSync(join(REPO, "tests/init/drift.test.ts"), "utf8")).toContain(cmd);
  });

  test("SCN-SKL-006-3 the skill warns about the Refs line and the CHANGELOG heading", () => {
    for (const s of ["Refs line", "500", "## Unreleased"]) expect(text, s).toContain(s);
  });
});
