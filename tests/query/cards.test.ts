// Covers: REQ-QRY-020, REQ-QRY-019, REQ-QRY-012, REQ-QRY-021, REQ-QRY-022, SCN-QRY-020-1, SCN-QRY-020-2, SCN-QRY-020-3, SCN-QRY-020-4, SCN-QRY-020-5, SCN-QRY-019-1
import { afterEach, describe, expect, test } from "vitest";
import { COVERS, Project, TAG } from "../helpers.ts";

let p: Project | undefined;
afterEach(() => {
  p?.cleanup();
  p = undefined;
});

interface B {
  text: string;
  omitted: string[];
  body_omitted: string[];
  chars: number;
  budget: number;
  complete: boolean;
}

const req = (n: number): string => `### Requirement: REQ-TH-00${n} Thing ${n}\nBody${n}start ${"y".repeat(1900)}\n\n`;
const lines = (t: string): string[] => t.split("\n");
const heads = (t: string): string[] => lines(t).filter((l) => l.startsWith("-- ")).map((l) => l.split(" | ")[0]!.slice(3));

/** A task cites five long requirements. Three code lines and two test lines tag the first. */
function cited(): Project {
  const q = new Project(null);
  q.write("openspec/specs/thing/spec.md", [1, 2, 3, 4, 5].map(req).join(""));
  for (const n of [1, 2, 3]) q.write(`src/c${n}.ts`, `${TAG}TH-001 code ${n}\n`);
  for (const n of [1, 2]) q.write(`tests/t${n}.test.ts`, `// ${COVERS}REQ-TH-001\n`);
  q.write("openspec/changes/009-add-x/tasks.md", "# Tasks\n\n- [ ] 1.1 Do it. [REQ-TH-001, REQ-TH-002, REQ-TH-003, REQ-TH-004, REQ-TH-005] Verify: `true`\n");
  return q;
}

async function context(q: Project, ...args: string[]): Promise<B> {
  const r = await q.run("context", "009/1.1", "--json", ...args);
  expect(r.code, r.err).toBe(0);
  return JSON.parse(r.out) as B;
}

describe("cards before bodies", () => {
  test("SCN-QRY-020-1 cards survive long bodies", async () => {
    p = cited();
    const b = await context(p);
    const h = heads(b.text);
    for (const f of ["src/c1.ts:1", "src/c2.ts:1", "src/c3.ts:1", "tests/t1.test.ts:1", "tests/t2.test.ts:1"]) expect(h).toContain(f);
    for (const n of [1, 2, 3, 4, 5]) expect(h).toContain(`REQ-TH-00${n}`);
    expect(b.omitted).toEqual([]);
  });

  test("SCN-QRY-020-2 a card without its body ends with the marker, and the ID is not omitted", async () => {
    p = cited();
    const b = await context(p);
    const marked = lines(b.text).filter((l) => l.startsWith("-- REQ-TH-") && l.endsWith(" | body omitted"));
    expect(marked.length).toBeGreaterThan(0);
    const ids = marked.map((l) => l.split(" | ")[0]!.slice(3));
    expect(b.body_omitted).toEqual(ids);
    for (const id of ids) {
      expect(b.omitted).not.toContain(id);
      expect(b.text).not.toContain(`Body${id.slice(-1)}start`);
    }
    // a body that printed has no marker
    expect(b.text).toContain("Body1start");
    expect(b.complete).toBe(false);
    expect(b.chars).toBe([...b.text].length);
  });

  test("SCN-QRY-020-3 many deltas keep their cards at the default budget", async () => {
    p = new Project(null);
    const delta = Array.from({ length: 14 }, (_, k) => `### Requirement: REQ-TH-${String(k + 10).padStart(3, "0")} Delta ${k}\nD${k} ${"z".repeat(700)}\n\n`).join("");
    p.write("openspec/changes/009-add-x/specs/thing/spec.md", "## ADDED Requirements\n\n" + delta);
    p.write("openspec/changes/009-add-x/tasks.md", "# Tasks\n\n- [ ] 1.1 Do it. Verify: `true`\n");
    const b = await context(p);
    const deltaLines = lines(b.text).filter((l) => l.startsWith("-- REQ-TH-") && l.includes("delta in change of 009/1.1"));
    expect(deltaLines).toHaveLength(14);
    expect(b.omitted.filter((i) => i.startsWith("REQ-TH-"))).toEqual([]);
    expect(b.text).not.toMatch(/^truncated: .*REQ-TH-/m);
  });

  test("SCN-QRY-020-4 a budget of 0 keeps the task block and names the depth 1 entries", async () => {
    p = cited();
    const b = await context(p, "--budget", "0");
    expect(heads(b.text)).toEqual(["009/1.1"]);
    expect(b.omitted).toContain("REQ-TH-001");
    expect(b.omitted).toContain("src/c1.ts:1");
    expect(b.body_omitted).toEqual([]);
    expect(b.text).not.toContain("body omitted");
    expect(b.complete).toBe(false);
  });

  test("SCN-QRY-020-5 everything fits, so no marker and no trailer", async () => {
    p = cited();
    const b = await context(p, "--budget", "100000");
    expect(b.text).not.toContain("body omitted");
    expect(b.text).not.toContain("truncated:");
    expect(b.omitted).toEqual([]);
    expect(b.body_omitted).toEqual([]);
    expect(b.complete).toBe(true);
  });

  test("SCN-QRY-019-1 the over budget figure and chars agree with the marker cost", async () => {
    p = cited();
    // the pinned task block alone is over a budget of 10, and no card fits
    const b = await context(p, "--budget", "10");
    const m = /^over budget: (\d+) of 10 characters$/m.exec(b.text);
    expect(m).not.toBeNull();
    const blockChars = [...b.text.split(/^truncated: /m)[0]!].length;
    expect(Number(m![1])).toBe(blockChars);
    // a budget that holds every card but no cited body: the marker counts in the charge
    const full = await context(p, "--budget", "5000");
    expect(full.body_omitted.length).toBeGreaterThan(0);
    const blockText = full.text.slice(0, full.text.search(/^(truncated|over budget): /m) < 0 ? undefined : full.text.search(/^(truncated|over budget): /m));
    expect([...blockText].length).toBeLessThanOrEqual(5000);
  });
});

describe("fixed text", () => {
  test("REQ-QRY-021 REQ-QRY-022 context of an uncited task with a named path and the note", async () => {
    p = new Project(null);
    p.write("src/a.ts", "const x = 1;\n");
    p.write("openspec/changes/009-add-x/tasks.md", "# Tasks\n\n- [ ] 1.1 Edit `src/a.ts` and `src/zz.ts`. Verify: `true`\n");
    const r = await p.run("context", "009/1.1");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toBe(
      "-- 009/1.1 | openspec/changes/009-add-x/tasks.md:3 | open | requested\n" +
        "- [ ] 1.1 Edit `src/a.ts` and `src/zz.ts`. Verify: `true`\n\n" +
        "note: 009/1.1 cites no requirement that the index holds. The blocks come from its change and the paths it names. Add a [REQ-...] citation.\n" +
        "-- src/a.ts | src/a.ts | active | named by 009/1.1\n",
    );
  });
});
