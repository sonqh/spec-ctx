// Covers: REQ-SKL-002
import { describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "../helpers.ts";

const SKILLS = ["specctx-bootstrap", "specctx-next", "specctx-done"];

describe("skill copies do not drift", () => {
  test("the copies in .claude/skills and .agents/skills of this repo equal skills/", () => {
    for (const d of [".claude/skills", ".agents/skills"]) {
      for (const s of SKILLS) {
        const src = join(REPO, "skills", s);
        for (const f of readdirSync(src)) {
          const a = readFileSync(join(src, f));
          const b = readFileSync(join(REPO, d, s, f));
          expect(b.equals(a), `${d}/${s}/${f} differs from skills/${s}/${f}. Run: node dist/cli.js init --skills --force`).toBe(true);
        }
      }
    }
  });

  test("src/assets.generated.ts matches schemas/ and skills/", () => {
    const r = spawnSync("node", [join(REPO, "scripts/gen-assets.mjs"), "--check"], { encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
  });
});
