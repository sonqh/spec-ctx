// Covers: REQ-QRY-027, REQ-QRY-021, REQ-QRY-020, SCN-QRY-027-1, SCN-QRY-027-2, SCN-QRY-027-3, SCN-QRY-020-1
import { afterEach, describe, expect, test } from "vitest";
import { Project, TAG } from "../helpers.ts";

let p: Project | undefined;
afterEach(() => {
  p?.cleanup();
  p = undefined;
});

interface B {
  text: string;
  omitted: string[];
  body_omitted: string[];
  used: number;
}

const heads = (t: string): string[] => t.split("\n").filter((l) => l.startsWith("-- ")).map((l) => l.split(" | ")[0]!.slice(3));
const REQ = (n: number): string => `### Requirement: REQ-TH-00${n} Thing ${n}\nThe thing ${n} SHALL work. ${"y".repeat(900)}\n\n#### Scenario: SCN-TH-00${n}-1 Works\n- **WHEN** a\n- **THEN** b\n\n`;
const TASK = (paths: string): string => `# Tasks\n\n- [ ] 1.1 Do it${paths}. [REQ-TH-001] Verify: \`true\`\n`;

/** A task cites REQ-TH-001. The file src/a.ts holds two tagged lines. */
function project(opts: { paths?: string; lines?: [number, number]; delta?: boolean } = {}): Project {
  const q = new Project(null);
  q.write("openspec/specs/thing/spec.md", REQ(1));
  const [x, y] = opts.lines ?? [1, 2];
  const rows = Array.from({ length: Math.max(x, y) }, (_, i) => (i + 1 === x || i + 1 === y ? `${TAG}TH-001 line ${i + 1}` : `const v${i} = ${i};`));
  q.write("src/a.ts", rows.join("\n") + "\n");
  q.write("src/n.ts", "const n = 1;\n");
  q.write("openspec/changes/009-add-x/tasks.md", TASK(opts.paths ?? ""));
  if (opts.delta) q.write("openspec/changes/009-add-x/specs/thing/spec.md", `## ADDED Requirements\n\n${REQ(2)}`);
  return q;
}

async function context(q: Project, id: string, ...args: string[]): Promise<B> {
  const r = await q.run("context", id, "--json", ...args);
  expect(r.code, r.err).toBe(0);
  return JSON.parse(r.out) as B;
}

const marked = (b: B, id: string): boolean => b.text.split("\n").some((l) => l.startsWith(`-- ${id} `) && l.endsWith(" | body omitted"));

describe("repeat line cards fill after cited bodies", () => {
  test("SCN-QRY-027-1 the cited body prints and a repeat line card goes to truncated", async () => {
    p = project();
    const full = await context(p, "009/1.1", "--budget", "100000");
    expect(heads(full.text)).toContain("src/a.ts:2");
    expect(marked(full, "REQ-TH-001")).toBe(false);
    const b = await context(p, "009/1.1", "--budget", String(full.used - 1));
    expect(marked(b, "REQ-TH-001")).toBe(false);
    expect(b.body_omitted).not.toContain("REQ-TH-001");
    expect(heads(b.text)).toContain("src/a.ts:1");
    expect(heads(b.text)).not.toContain("src/a.ts:2");
    expect(b.omitted).toContain("src/a.ts:2");
  });

  test("SCN-QRY-027-2 the named by card fills before a repeat line card", async () => {
    p = project({ paths: " in `src/n.ts`" });
    const full = await context(p, "009/1.1", "--budget", "100000");
    expect(heads(full.text)).toContain("src/n.ts");
    const b = await context(p, "009/1.1", "--budget", String(full.used - 1));
    expect(heads(b.text)).toContain("src/n.ts");
    expect(heads(b.text)).toContain("src/a.ts:1");
    expect(heads(b.text)).not.toContain("src/a.ts:2");
    expect(b.omitted).toContain("src/a.ts:2");
    expect(marked(b, "REQ-TH-001")).toBe(false);
  });

  test("SCN-QRY-027-3 the first line in print order keeps its place, so :100 stays and :9 goes", async () => {
    p = project({ lines: [9, 100] });
    const full = await context(p, "009/1.1", "--budget", "100000");
    const h = heads(full.text).filter((x) => x.startsWith("src/a.ts:"));
    expect(h).toEqual(["src/a.ts:100", "src/a.ts:9"]);
    const b = await context(p, "009/1.1", "--budget", String(full.used - 1));
    expect(heads(b.text)).toContain("src/a.ts:100");
    expect(heads(b.text)).not.toContain("src/a.ts:9");
    expect(b.omitted).toContain("src/a.ts:9");
    expect(marked(b, "REQ-TH-001")).toBe(false);
  });

  test("REQ-QRY-027 the named by and repeat cards fill before the cards of class 2", async () => {
    p = project({ paths: " in `src/n.ts`", delta: true });
    const full = await context(p, "009/1.1", "--budget", "100000");
    const ls = full.text.split("\n");
    const at = ls.findIndex((l) => l.startsWith("-- REQ-TH-002 "));
    expect(at).toBeGreaterThan(0);
    let end = ls.findIndex((l, i) => i > at && l.startsWith("-- "));
    if (end < 0) end = ls.length;
    const delta = ls.slice(at, end).join("\n").length + 1;
    const b = await context(p, "009/1.1", "--budget", String(full.used - delta));
    expect(heads(b.text)).toContain("src/n.ts");
    expect(heads(b.text)).toContain("src/a.ts:2");
    expect(heads(b.text)).not.toContain("REQ-TH-002");
    expect(b.omitted).toContain("REQ-TH-002");
  });

  test("REQ-QRY-027 context of a file keeps both line cards of one file", async () => {
    p = project();
    const b = await context(p, "src/a.ts");
    const h = heads(b.text).filter((x) => x.startsWith("src/a.ts:"));
    expect(h).toEqual(["src/a.ts:1", "src/a.ts:2"]);
    expect(b.omitted).toEqual([]);
  });

  test("SCN-QRY-020-1 every cited card and every line card print when two lines share a file", async () => {
    p = project({ paths: " in `src/n.ts`" });
    const b = await context(p, "009/1.1");
    const h = heads(b.text);
    for (const f of ["REQ-TH-001", "src/a.ts:1", "src/a.ts:2", "src/n.ts"]) expect(h).toContain(f);
    expect(b.omitted).toEqual([]);
  });
});
