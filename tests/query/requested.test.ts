// Covers: REQ-QRY-018, REQ-QRY-019, REQ-QRY-014
import { afterEach, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

let p: Project | undefined;
afterEach(() => {
  p?.cleanup();
  p = undefined;
});

interface Json {
  text: string;
  omitted: string[];
  chars: number;
  budget: number | null;
  complete: boolean;
}

const WORDS = "word ".repeat(60).trim();
const cp = (s: string): number => [...s].length;
const heads = (text: string): string[] => text.split("\n").filter((l) => l.startsWith("-- ")).map((l) => l.split(" | ")[0]!.slice(3));
const lines = (text: string): string[] => text.split("\n").filter((l) => l !== "");
/** The code point length of the blocks, without the trailer lines. */
const used = (text: string): number => cp(text.split("\n").filter((l) => !/^(truncated|over budget): /.test(l)).join("\n"));

/** The repro of the consumer report: one spec with one long requirement. */
function repro(): Project {
  const q = new Project(null);
  q.write("openspec/specs/example/spec.md", `### Requirement: REQ-TEST-001 Long one\nThe system SHALL do a long thing ${WORDS}.\n\n#### Scenario: SCN-TEST-001-1 Works\n- **WHEN** a\n- **THEN** b\n`);
  return q;
}

/** Two long requirements and one short one that names both. */
function two(): Project {
  const q = new Project(null);
  q.write("openspec/specs/thing/spec.md",
    `### Requirement: REQ-TH-001 One\nOne SHALL work ${WORDS}.\n\nRefs: REQ-TH-003\n\n### Requirement: REQ-TH-002 Two\nTwo SHALL work ${WORDS}.\n\nRefs: REQ-TH-003\n\n### Requirement: REQ-TH-003 Three\nThree SHALL work.\n`);
  return q;
}

async function json(q: Project, ...args: string[]): Promise<Json> {
  const r = await q.run(...args, "--json");
  expect(r.code, r.err).toBe(0);
  return JSON.parse(r.out) as Json;
}

describe("requested blocks stay", () => {
  test("SCN-QRY-018-1 a requested block longer than the budget", async () => {
    p = repro();
    const r = await p.run("context", "REQ-TEST-001", "--budget", "100");
    expect(r.code, r.err).toBe(0);
    expect(heads(r.out)).toContain("REQ-TEST-001");
    expect(r.out).toContain("The system SHALL do a long thing");
    expect(lines(r.out).at(-1)).toMatch(/^over budget: \d+ of 100 characters$/);
    const j = await json(p, "context", "REQ-TEST-001", "--budget", "100");
    expect(j.omitted).not.toContain("REQ-TEST-001");
    expect(j.text).toBe(r.out);
  });

  test("SCN-QRY-018-2 several requested IDs", async () => {
    p = two();
    const j = await json(p, "bundle", "REQ-TH-002", "REQ-TH-001", "--budget", "50");
    const h = heads(j.text);
    expect(h.indexOf("REQ-TH-002")).toBeGreaterThanOrEqual(0);
    expect(h.indexOf("REQ-TH-001")).toBeGreaterThan(h.indexOf("REQ-TH-002"));
    expect(j.omitted).not.toContain("REQ-TH-001");
    expect(j.omitted).not.toContain("REQ-TH-002");
  });

  test("SCN-QRY-018-3 and SCN-QRY-019-3 task start prints a long task line", async () => {
    p = repro();
    p.write("spec-ctx.toml", "[bundle]\nbudget = 60\n");
    p.write("openspec/changes/009-add-x/tasks.md", `# Tasks\n\n- [ ] 1.1 Do the long thing ${WORDS}. [REQ-TEST-001] Verify: \`true\`\n`);
    const r = await p.run("task", "start", "009/1.1");
    expect(r.code, r.err).toBe(0);
    expect(heads(r.out)[0]).toBe("009/1.1");
    expect(r.out).toContain("1.1 Do the long thing");
    expect(r.out).toMatch(/^over budget: \d+ of 60 characters$/m);
    const j = JSON.parse((await p.run("task", "start", "009/1.1", "--json")).out) as { bundle: Json };
    expect(heads(j.bundle.text)[0]).toBe("009/1.1");
    expect(j.bundle.chars).toBe(cp(j.bundle.text));
    expect(j.bundle.budget).toBe(60);
    expect(j.bundle.complete).toBe(j.bundle.omitted.length === 0);
    expect(j.bundle.omitted).not.toContain("009/1.1");
  });

  test("SCN-QRY-018-4 the over budget line follows the truncated line", async () => {
    p = repro();
    const r = await p.run("bundle", "REQ-TEST-001", "--budget", "100");
    const l = lines(r.out);
    expect(l.at(-2)).toBe("truncated: 1 entries omitted: cap/example");
    expect(l.at(-1)).toBe(`over budget: ${used(r.out)} of 100 characters`);
  });

  test("SCN-QRY-018-5 all blocks fit", async () => {
    p = repro();
    const r = await p.run("bundle", "REQ-TEST-001", "--budget", "100000");
    expect(r.out).not.toMatch(/^(truncated|over budget): /m);
    expect(heads(r.out)).toEqual(["REQ-TEST-001", "cap/example"]);
  });

  test("SCN-QRY-018-6 zero and negative budget", async () => {
    p = repro();
    const r = await p.run("bundle", "REQ-TEST-001", "--budget", "0");
    expect(r.code, r.err).toBe(0);
    expect(heads(r.out)).toEqual(["REQ-TEST-001"]);
    expect(lines(r.out).at(-2)).toMatch(/^truncated: /);
    expect(lines(r.out).at(-1)).toMatch(/^over budget: \d+ of 0 characters$/);
    for (const cmd of ["bundle", "context"]) {
      const n = await p.run(cmd, "REQ-TEST-001", "--budget", "-1");
      expect(n.code, cmd).toBe(2);
      expect(n.out, cmd).not.toContain("-- REQ-TEST-001");
    }
  });
});

describe("completeness fields", () => {
  test("SCN-QRY-019-1 fields", async () => {
    p = two();
    const drop = await json(p, "bundle", "REQ-TH-001", "--budget", "50");
    const fit = await json(p, "bundle", "REQ-TH-001", "--budget", "100000");
    for (const [j, b] of [[drop, 50], [fit, 100000]] as const) {
      expect(j.chars).toBe(cp(j.text));
      expect(j.budget).toBe(b);
    }
    expect(drop.complete).toBe(false);
    expect(drop.omitted.length).toBeGreaterThan(0);
    expect(fit.complete).toBe(true);
    expect(fit.omitted).toEqual([]);
    const q = new Project(null);
    try {
      q.write("openspec/specs/lone/spec.md", `### Requirement: REQ-LN-001 Lone\nLone SHALL work ${WORDS}.\n`);
      // the capability block is the one neighbor. Both are requested, so no block can drop.
      const all = await json(q, "bundle", "REQ-LN-001", "cap/lone", "--budget", "100000");
      const size = cp(all.text);
      const lone = await json(q, "bundle", "REQ-LN-001", "cap/lone", "--budget", String(size - 10));
      expect(lone.complete).toBe(true);
      expect(lone.chars).toBe(cp(lone.text));
      expect(lone.chars).toBeGreaterThan(lone.budget!);
    } finally {
      q.cleanup();
    }
  });

  test("SCN-QRY-019-2 block mode", async () => {
    p = two();
    const j = await json(p, "bundle", "REQ-TH-001", "--block");
    expect(j.budget).toBeNull();
    expect(j.complete).toBe(true);
    expect(j.omitted).toEqual([]);
    expect(j.chars).toBe(cp(j.text));
  });
});

describe("omitted trailer and requested IDs", () => {
  test("SCN-QRY-014-2 requested ID never omitted", async () => {
    p = two();
    p.write("openspec/changes/009-add-x/specs/thing/spec.md",
      `## MODIFIED Requirements\n\n### Requirement: REQ-TH-001 One\nOne SHALL work better ${WORDS}.\n\nRefs: REQ-TH-003\n`);
    const j = await json(p, "bundle", "REQ-TH-001", "--budget", "50");
    const reasons = j.text.split("\n").filter((l) => l.startsWith("-- REQ-TH-001 |")).map((l) => l.split(" | ")[3]);
    expect(reasons).toEqual(["requested", "main version of REQ-TH-001"]);
    expect(j.omitted).not.toContain("REQ-TH-001");
  });

  test("SCN-QRY-014-3 requested decision", async () => {
    p = two();
    p.write("openspec/changes/009-add-x/design.md", "# Design\n\n## Decisions\n\n- D1 Pick one. Refs: REQ-TH-001\n");
    for (const budget of ["100000", "10"]) {
      const j = await json(p, "bundle", "009/D1", "REQ-TH-001", "--budget", budget);
      const rows = j.text.split("\n").filter((l) => l.startsWith("-- 009/D1 |"));
      expect(rows.length, budget).toBe(1);
      expect(rows[0]!.includes("| requested |"), budget).toBe(true);
      expect(j.omitted, budget).not.toContain("009/D1");
    }
  });
});
