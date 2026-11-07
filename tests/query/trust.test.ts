// Covers: REQ-QRY-023, REQ-QRY-024, REQ-QRY-025, REQ-QRY-026, SCN-QRY-023-1, SCN-QRY-023-2, SCN-QRY-023-3, SCN-QRY-023-4, SCN-QRY-024-1, SCN-QRY-024-2, SCN-QRY-024-3, SCN-QRY-024-4, SCN-QRY-025-1, SCN-QRY-025-2, SCN-QRY-025-3, SCN-QRY-026-1, SCN-QRY-026-2, SCN-QRY-026-3, SCN-QRY-026-4
import { afterEach, describe, expect, test } from "vitest";
import { REASONS } from "../../src/graph/related.ts";
import { provenanceClass } from "../../src/graph/trust.ts";
import { COVERS, Project, TAG } from "../helpers.ts";

let p: Project | undefined;
afterEach(() => {
  p?.cleanup();
  p = undefined;
});

interface Block {
  id: string;
  file: string;
  line: number;
  status: string;
  reason: string;
  provenance: string;
  evidence: string | null;
}
interface B {
  text: string;
  chars: number;
  used: number;
  omitted: string[];
  blocks: Block[];
}

const card = (text: string, id: string): string | undefined => text.split("\n").find((l) => l.startsWith(`-- ${id} |`));
const cols = (line: string): string[] => line.split(" | ");

/** a project with one cited requirement, a tagged code line, a tagged test line, and a delta */
function project(): Project {
  const q = new Project(null);
  q.write("openspec/specs/thing/spec.md", "### Requirement: REQ-TH-001 Thing\nThe thing SHALL work.\n\n### Requirement: REQ-TH-002 Other\nThe other SHALL work.\n");
  q.write("openspec/changes/009-add-x/specs/thing/spec.md", "## ADDED Requirements\n\n### Requirement: REQ-TH-009 New\nThe new SHALL work.\n");
  q.write("src/a.ts", `${TAG}TH-001 tagged\nconst a = 1;\n`);
  q.write("tests/a.test.ts", `// ${COVERS}REQ-TH-001\n`);
  q.write(
    "openspec/changes/009-add-x/tasks.md",
    "# Tasks\n\n- [ ] 1.1 Do it `src/a.ts` `tests/a.test.ts`. [REQ-TH-001] Verify: `true`\n- [ ] 1.2 Also `src/a.ts` `tests/a.test.ts`. [REQ-TH-001] Verify: `true`\n- [ ] 1.3 Other. [REQ-TH-002] Verify: `true`\n",
  );
  return q;
}

async function context(q: Project, id: string, ...args: string[]): Promise<B> {
  const r = await q.run("context", id, "--json", ...args);
  expect(r.code, r.err).toBe(0);
  return JSON.parse(r.out) as B;
}

async function done(q: Project, id: string): Promise<void> {
  const s = await q.run("task", "start", id);
  expect(s.code, s.err).toBe(0);
  const d = await q.run("task", "done", id);
  expect(d.code, d.err).toBe(0);
}

describe("provenance class", () => {
  test("SCN-QRY-023-1 the classes of a task, its code, its test, and its delta", async () => {
    p = project();
    const b = await context(p, "009/1.1");
    expect(cols(card(b.text, "009/1.1")!)[4]).toBe("declared");
    expect(cols(card(b.text, "src/a.ts:1")!)[4]).toBe("tagged");
    expect(cols(card(b.text, "tests/a.test.ts:1")!)[4]).toBe("tagged");
    expect(cols(card(b.text, "REQ-TH-009")!)[4]).toBe("structural");
    expect(cols(card(b.text, "REQ-TH-001")!)[4]).toBe("declared");
  });

  test("REQ-QRY-023 every reason of the walk has a class", () => {
    const table: Record<string, string> = {
      "scenario of": "declared", "ref from": "declared", "ref to": "declared", "decision for": "declared", "task cites": "declared",
      implements: "tagged", covers: "tagged", mentions: "declared", "delta in": "structural", "design named in": "structural",
      "task names": "structural", "capability of": "structural", "requirement in": "structural", "capability touched by": "structural",
      "main version of": "structural", "named by": "declared",
    };
    expect(Object.keys(table).sort()).toEqual([...REASONS].sort());
    for (const r of REASONS) expect(provenanceClass(r), r).toBe(table[r]);
    expect(provenanceClass("requested")).toBe("declared");
    expect(provenanceClass("implements REQ-X")).toBe("tagged");
    expect(provenanceClass("main version of REQ-X")).toBe("structural");
    expect(provenanceClass("something new")).toBe("declared");
  });

  test("SCN-QRY-023-2 SCN-QRY-023-3 a line is verified by fresh evidence and never after a change", async () => {
    p = project();
    await done(p, "009/1.1");
    let b = await context(p, "009/1.1");
    expect(cols(card(b.text, "src/a.ts:1")!)[4]).toBe("verified");
    expect(cols(card(b.text, "tests/a.test.ts:1")!)[4]).toBe("verified");
    p.write("src/a.ts", `${TAG}TH-001 tagged\nconst a = 2;\n`);
    b = await context(p, "009/1.1");
    expect(cols(card(b.text, "src/a.ts:1")!)[4]).toBe("tagged");
    expect(b.text).not.toContain("verified | ");
    expect(cols(card(b.text, "009/1.1")!)[5]).toBe("stale since src/a.ts");
  });

  test("SCN-QRY-023-4 the marker follows the trust columns and the first four columns stay", async () => {
    p = project();
    p.write("openspec/specs/thing/spec.md", `### Requirement: REQ-TH-001 Thing\nThe thing SHALL work. ${"Long text. ".repeat(60)}\n`);
    p.write("openspec/changes/009-add-x/tasks.md", "# Tasks\n\n- [ ] 1.1 Do it. [REQ-TH-001] Verify: `true`\n");
    const b = await context(p, "009/1.1", "--budget", "450");
    const marked = b.text.split("\n").filter((l) => l.startsWith("-- ") && l.endsWith(" | body omitted"));
    expect(marked.length).toBeGreaterThan(0);
    for (const l of marked) {
      const c = cols(l);
      expect(c.length).toBeGreaterThanOrEqual(6);
      expect(c.at(-1)).toBe("body omitted");
      expect(["declared", "tagged", "structural", "verified"]).toContain(c[4]);
    }
    expect(cols(card(b.text, "009/1.1")!).slice(0, 4)).toEqual(["-- 009/1.1", "openspec/changes/009-add-x/tasks.md:3", "open", "requested"]);
  });
});

describe("evidence state", () => {
  test("SCN-QRY-024-1 SCN-QRY-024-3 fresh after task done, no evidence before", async () => {
    p = project();
    let b = await context(p, "009/1.1");
    expect(cols(card(b.text, "009/1.1")!)[5]).toBe("no evidence");
    await done(p, "009/1.1");
    b = await context(p, "009/1.1");
    expect(cols(card(b.text, "009/1.1")!)[5]).toBe("fresh");
    expect(b.text).not.toContain("| current");
  });

  test("SCN-QRY-024-2 stale since the path that check reports", async () => {
    p = project();
    await done(p, "009/1.1");
    p.write("tests/a.test.ts", `// ${COVERS}REQ-TH-001\n// changed\n`);
    const b = await context(p, "009/1.1");
    expect(cols(card(b.text, "009/1.1")!)[5]).toBe("stale since tests/a.test.ts");
    const c = await p.run("check", "--strict");
    expect(c.out).toContain("stale-evidence  009/1.1 tests/a.test.ts");
  });

  test("REQ-QRY-024 a damaged evidence file is stale as a whole, as check reports it", async () => {
    p = project();
    await done(p, "009/1.1");
    p.write(".ctx/evidence/009/1.1.json", "{ not json");
    const b = await context(p, "009/1.1");
    expect(cols(card(b.text, "009/1.1")!)[5]).toBe("stale since .ctx/evidence/009/1.1.json");
  });

  test("SCN-QRY-024-4 an archived task is fresh with evidence and no evidence without", async () => {
    p = project();
    await done(p, "009/1.1");
    const q = p;
    const tasks = q.read("openspec/changes/009-add-x/tasks.md");
    q.write("openspec/changes/archive/2026-01-01-009-add-x/tasks.md", tasks);
    q.write("openspec/changes/archive/2026-01-01-009-add-x/specs/thing/spec.md", q.read("openspec/changes/009-add-x/specs/thing/spec.md"));
    // the active copy goes away, so the archived copy is the task
    q.write("openspec/changes/009-add-x/tasks.md", "# Tasks\n");
    await q.build();
    let b = await context(q, "009/1.1");
    expect(cols(card(b.text, "009/1.1")!)[5]).toBe("fresh");
    // 1.2 is done in the archive without an evidence file
    q.write("openspec/changes/archive/2026-01-01-009-add-x/tasks.md", tasks.replace("- [ ] 1.2", "- [x] 1.2"));
    await q.build();
    b = await context(q, "009/1.2");
    expect(cols(card(b.text, "009/1.2")!)[5]).toBe("no evidence");
  });

  test("SCN-QRY-025-1 SCN-QRY-025-2 SCN-QRY-025-3 a requirement is verified by one fresh task, and its main version agrees", async () => {
    p = project();
    let b = await context(p, "REQ-TH-001");
    expect(cols(card(b.text, "REQ-TH-001")!)[5]).toBe("unverified");
    await done(p, "009/1.1");
    await done(p, "009/1.2");
    p.write("tests/a.test.ts", `// ${COVERS}REQ-TH-001\n// changed\n`);
    // 1.1 and 1.2 both list the test file, so both are stale now. Redo 1.1 so one is fresh.
    await p.run("task", "reopen", "009/1.1", "test");
    await done(p, "009/1.1");
    b = await context(p, "REQ-TH-001");
    expect(cols(card(b.text, "009/1.2")!)[5]).toBe("stale since tests/a.test.ts");
    expect(cols(card(b.text, "REQ-TH-001")!)[5]).toBe("verified");
    expect(cols(card((await context(p, "REQ-TH-002")).text, "REQ-TH-002")!)[5]).toBe("unverified");
    // a delta copy and its main version share the state
    p.write("openspec/changes/009-add-x/specs/thing/spec.md", "## MODIFIED Requirements\n\n### Requirement: REQ-TH-001 Thing\nThe thing SHALL work well.\n");
    b = await context(p, "REQ-TH-001");
    const heads = b.text.split("\n").filter((l) => l.startsWith("-- REQ-TH-001 |"));
    expect(heads).toHaveLength(2);
    expect(new Set(heads.map((l) => cols(l)[5]))).toEqual(new Set(["verified"]));
  });
});

describe("json", () => {
  test("SCN-QRY-026-1 used counts the blocks and chars the whole text", async () => {
    p = project();
    const b = await context(p, "009/1.1", "--budget", "300");
    expect(b.omitted.length).toBeGreaterThan(0);
    expect(b.chars).toBeGreaterThan(b.used);
    const trailer = b.text.split("\n").find((l) => l.startsWith("truncated: "))!;
    const over = b.text.split("\n").find((l) => l.startsWith("over budget: "));
    expect(b.chars - b.used).toBe([...trailer].length + 1 + (over ? [...over].length + 1 : 0));
  });

  test("SCN-QRY-026-2 one block object per printed block, in print order", async () => {
    p = project();
    const b = await context(p, "009/1.1");
    const cards = b.text.split("\n").filter((l) => l.startsWith("-- ")).map((l) => l.slice(3).split(" | ")[0]);
    expect(b.blocks.map((x) => x.id)).toEqual(cards);
    for (const x of b.blocks) expect(Object.keys(x).sort()).toEqual(["evidence", "file", "id", "line", "provenance", "reason", "status"]);
    expect(b.blocks.find((x) => x.id === "src/a.ts:1")!.evidence).toBeNull();
    expect(b.blocks.find((x) => x.id === "009/1.1")!.evidence).toBe("no evidence");
  });

  test("SCN-QRY-026-3 block mode has no blocks and used equals chars", async () => {
    p = project();
    const r = await p.run("bundle", "REQ-TH-001", "--block", "--json");
    expect(r.code, r.err).toBe(0);
    const j = JSON.parse(r.out) as B;
    expect(j.blocks).toEqual([]);
    expect(j.used).toBe(j.chars);
  });

  test("SCN-QRY-026-4 task start carries used and blocks", async () => {
    p = project();
    const r = await p.run("task", "start", "009/1.1", "--json");
    expect(r.code, r.err).toBe(0);
    const j = JSON.parse(r.out) as { bundle: B };
    expect(typeof j.bundle.used).toBe("number");
    expect(j.bundle.blocks.length).toBeGreaterThan(0);
  });
});
