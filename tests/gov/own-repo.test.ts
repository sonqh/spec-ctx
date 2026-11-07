// Covers: REQ-GOV-014, REQ-ADOPT-006
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { REPO } from "../helpers.ts";

const readme = readFileSync(join(REPO, "README.md"), "utf8");
const reference = readFileSync(join(REPO, "docs/reference.md"), "utf8");
const HEAD = "## Try it on your own OpenSpec repo";

/** The first bash block after a line, as its command lines. */
function bashAfter(text: string, at: number): string[] {
  const lines = text.split("\n");
  const open = lines.findIndex((l, i) => i > at && l.startsWith("```bash"));
  const close = lines.findIndex((l, i) => i > open && l.startsWith("```"));
  return lines.slice(open + 1, close).map((l) => l.replace(/\s+#.*$/, "").trim()).filter(Boolean);
}

describe("REQ-GOV-014 README block for an own repo", () => {
  test("SCN-GOV-014-1 the block follows Quickstart and holds three commands in order", () => {
    const lines = readme.split("\n");
    const q = lines.indexOf("## Quickstart");
    const h = lines.indexOf(HEAD);
    expect(h).toBeGreaterThan(q);
    // no other section sits between Quickstart and the new one
    expect(lines.slice(q + 1, h).filter((l) => l.startsWith("## "))).toEqual([]);
    expect(bashAfter(readme, h)).toEqual(["npx -y spec-ctx init --all", "npx -y spec-ctx adopt", "npx -y spec-ctx context <task>"]);
    const end = lines.findIndex((l, i) => i > h && l.startsWith("## "));
    const body = lines.slice(h, end).join("\n");
    expect(body).toMatch(/`init` prints the next command/);
    // REQ-ADOPT-006 the gate step comes after the three commands
    expect(body.indexOf("baseline write")).toBeGreaterThan(body.indexOf("context <task>"));
  });

  test("SCN-GOV-014-2 the reference starts the existing path with the same three commands", () => {
    const lines = reference.split("\n");
    const at = lines.indexOf("### Existing OpenSpec project");
    expect(at).toBeGreaterThan(-1);
    const cmds = bashAfter(reference, at).map((l) => l.replace(/^(npx( -y)? spec-ctx|specctx) /, ""));
    expect(cmds.map((l) => l.split(" ")[0])).toEqual(["init", "adopt", "context"]);
    // the gate lines follow under a later step
    const end = lines.findIndex((l, i) => i > at && l.startsWith("#"));
    const body = lines.slice(at, end).join("\n");
    expect(body.indexOf("baseline write")).toBeGreaterThan(body.indexOf("context <task>"));
    expect(body.indexOf("gate --strict")).toBeGreaterThan(body.indexOf("baseline write"));
    expect(body).toContain("Then, to gate the old debt");
    expect(body).toContain("baseline:");
  });
});
