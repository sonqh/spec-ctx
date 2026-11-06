// Covers: REQ-QRY-022, REQ-QRY-018, SCN-QRY-022-1, SCN-QRY-022-2, SCN-QRY-022-3, SCN-QRY-022-4
import { afterEach, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

let p: Project | undefined;
afterEach(() => {
  p?.cleanup();
  p = undefined;
});

interface B {
  text: string;
  omitted: string[];
  chars: number;
}
const note = (t: string): string => `note: ${t} cites no requirement that the index holds. The blocks come from its change and the paths it names. Add a [REQ-...] citation.`;

function project(): Project {
  const q = new Project(null);
  q.write("openspec/specs/thing/spec.md", "### Requirement: REQ-TH-001 Thing\nThe thing SHALL work.\n");
  q.write("openspec/changes/009-add-x/specs/thing/spec.md", "## ADDED Requirements\n\n### Requirement: REQ-TH-009 New\nThe new SHALL work.\n");
  q.write(
    "openspec/changes/009-add-x/tasks.md",
    [
      "# Tasks",
      "",
      "- [ ] 1.1 No citation. Verify: `true`",
      "- [ ] 1.2 Cited. [REQ-TH-001] Verify: `true`",
      "- [ ] 1.3 Unknown. [REQ-ZZZ-009] Verify: `true`",
      "- [ ] 1.4 Also no citation. Verify: `true`",
      "",
    ].join("\n"),
  );
  return q;
}

async function run(q: Project, cmd: string, ids: string[], ...args: string[]): Promise<B> {
  const r = await q.run(cmd, ...ids, "--json", ...args);
  expect(r.code, r.err).toBe(0);
  return JSON.parse(r.out) as B;
}

describe("uncited note", () => {
  test("SCN-QRY-022-1 the note follows the task block, and the deltas of the change follow the note", async () => {
    p = project();
    const b = await run(p, "context", ["009/1.1"]);
    const ls = b.text.split("\n");
    expect(ls[0]).toMatch(/^-- 009\/1\.1 \| /);
    const at = ls.indexOf(note("009/1.1"));
    expect(at).toBeGreaterThan(0);
    expect(ls.slice(0, at).some((l) => l.startsWith("-- ") && !l.startsWith("-- 009/1.1 |"))).toBe(false);
    expect(ls.slice(at).some((l) => l.startsWith("-- REQ-TH-009 |") && l.endsWith("delta in change of 009/1.1"))).toBe(true);
    expect(b.chars).toBe([...b.text].length);
  });

  test("SCN-QRY-022-2 a cited task has no note", async () => {
    p = project();
    const b = await run(p, "context", ["009/1.2"]);
    expect(b.text).not.toContain("note:");
  });

  test("SCN-QRY-022-3 an unknown citation gives the note, and the note is no omitted entry", async () => {
    p = project();
    const b = await run(p, "context", ["009/1.3"], "--budget", "0");
    expect(b.text.split("\n")).toContain(note("009/1.3"));
    expect(b.omitted.some((i) => i.startsWith("note"))).toBe(false);
    expect(b.omitted).not.toContain("009/1.3");
  });

  test("SCN-QRY-022-4 two uncited tasks give one note, for the first, after both pinned blocks", async () => {
    p = project();
    const b = await run(p, "bundle", ["009/1.1", "009/1.4"]);
    const ls = b.text.split("\n");
    expect(ls.filter((l) => l.startsWith("note:"))).toEqual([note("009/1.1")]);
    const at = ls.indexOf(note("009/1.1"));
    expect(ls.findIndex((l) => l.startsWith("-- 009/1.4 |"))).toBeLessThan(at);
  });
});
