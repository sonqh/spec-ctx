// Covers: REQ-SKL-005
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
});
