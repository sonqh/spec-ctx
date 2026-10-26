// Covers: REQ-GOV-008
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { REPO } from "../helpers.ts";

const DEMO = join(REPO, "docs/demo");

describe("demo story", () => {
  test("SCN-GOV-008-1 the transcript holds the six steps: adopt, status, next, the bundle footer, Verify, and the handoff", () => {
    const lines = readFileSync(join(DEMO, "loop.txt"), "utf8").split("\n");
    let at = -1;
    for (let n = 1; n <= 6; n++) {
      const i = lines.findIndex((l, k) => k > at && l.startsWith(`# ${n}.`));
      expect(i, `caption # ${n}.`).toBeGreaterThan(at);
      at = i;
    }
    // adopt --dry-run prints "<old header>  ->  <new header>"
    expect(lines.some((l) => /->\s+### Requirement: REQ-/.test(l))).toBe(true);
    const footer = lines.findIndex((l) => l.startsWith("-- bundle "));
    const refused = lines.findIndex((l) => l.includes("The task stays open."));
    const done = lines.findIndex((l) => l.startsWith("done add-mfa/1.3"));
    const handoff = lines.findIndex((l) => l.startsWith("$ specctx handoff write"));
    expect(footer).toBeGreaterThan(0);
    expect(refused).toBeGreaterThan(footer);
    expect(done).toBeGreaterThan(refused);
    expect(handoff).toBeGreaterThan(done);
    expect(lines.some((l) => l.startsWith("$ specctx stats"))).toBe(false);
  });

  test("SCN-GOV-008-2 the SVG is under 400 kB and the cast is under 30 seconds", () => {
    expect(statSync(join(DEMO, "loop.svg")).size).toBeLessThan(400_000);
    const events = readFileSync(join(DEMO, "loop.cast"), "utf8").trim().split("\n");
    const last = JSON.parse(events[events.length - 1]!) as [number, string, string];
    expect(last[0]).toBeLessThan(30);
    // the captions print dim and the refusal prints red
    const cast = events.join("\n");
    expect(cast).toContain("\\u001b[2m# 1.");
    expect(cast).toContain("\\u001b[31mVerify failed (exit 1). The task stays open.");
  });
});
