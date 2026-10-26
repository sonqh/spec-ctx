// Covers: REQ-GOV-008
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { REPO } from "../helpers.ts";

const DEMO = join(REPO, "docs/demo");
const CLIPS = ["1-adopt", "2-status", "3-next", "4-start", "5-done", "6-handoff"];
const HEADINGS = [
  "Give every requirement an ID",
  "Where are we",
  "What is next",
  "Only the spec this task needs",
  "Done means Verify passed",
  "Hand off to the next session",
];

describe("demo story", () => {
  test("SCN-GOV-008-1 the transcript holds the six steps: adopt, status, next, the bundle footer, Verify, and the handoff", () => {
    const lines = readFileSync(join(DEMO, "loop.txt"), "utf8").split("\n");
    let at = -1;
    for (let n = 1; n <= 6; n++) {
      const i = lines.findIndex((l, k) => k > at && l.startsWith(`# ${n}.`));
      expect(i, `heading # ${n}.`).toBeGreaterThan(at);
      expect(lines[i]).toBe(`# ${n}. ${HEADINGS[n - 1]}`);
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

  test("SCN-GOV-008-2 the six SVGs are under 400 kB together and each cast is under 7 seconds", () => {
    let total = 0;
    for (const c of CLIPS) {
      total += statSync(join(DEMO, "clips", `${c}.svg`)).size;
      const events = readFileSync(join(DEMO, "clips", `${c}.cast`), "utf8").trim().split("\n");
      const last = JSON.parse(events[events.length - 1]!) as [number, string, string];
      expect(last[0], c).toBeLessThan(7);
      // no caption inside a clip: the first output is the prompt
      const first = JSON.parse(events[1]!) as [number, string, string];
      expect(first[2], c).toMatch(/^\u001b\[1;32m\$/);
    }
    expect(total).toBeLessThan(400_000);
    // the refusal prints red
    expect(readFileSync(join(DEMO, "clips", "5-done.cast"), "utf8")).toContain("\\u001b[31mVerify failed (exit 1). The task stays open.");
  });

  test("SCN-GOV-008-3 the numbers in the step 4 text of the README equal the bundle footer of the transcript", () => {
    const footer = readFileSync(join(DEMO, "loop.txt"), "utf8").split("\n").find((l) => l.startsWith("-- bundle "))!;
    const m = /^-- bundle (\d+) chars, (\d+(?:\.\d)?)% of /.exec(footer);
    expect(m).not.toBeNull();
    const readme = readFileSync(join(REPO, "README.md"), "utf8").split("\n");
    const from = readme.indexOf("### 4. Only the spec this task needs");
    const to = readme.indexOf("### 5. Done means Verify passed");
    expect(from).toBeGreaterThan(0);
    const step = readme.slice(from, to).join("\n");
    const said = /You see: (\d+) characters, (\d+(?:\.\d)?) percent of the tree\./.exec(step);
    expect(said).not.toBeNull();
    expect(said![1]).toBe(m![1]);
    expect(said![2]).toBe(m![2]);
  });
});
