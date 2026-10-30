// Covers: REQ-QRY-016, REQ-QRY-017, REQ-QRY-005
import { cpSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { COVERS, Project, REPO, TAG } from "../helpers.ts";

let p: Project | undefined;
afterEach(() => {
  p?.cleanup();
  p = undefined;
});

const SPEC = "### Requirement: REQ-TH-001 Thing\nThe thing SHALL work.\n\nRefs: REQ-TH-002\n\n#### Scenario: SCN-TH-001-1 Works\n- **WHEN** a\n- **THEN** b\n\n### Requirement: REQ-TH-002 Next\nNext SHALL work.\n";
const LONG = "x".repeat(300);
const DELTA = (n: number): string => `### Requirement: REQ-TH-0${n}0 Delta ${n}\n${LONG} ${LONG}\n\n#### Scenario: SCN-TH-0${n}0-1 S\n- **WHEN** a\n- **THEN** b\n`;

const heads = (text: string): string[] => text.split("\n").filter((l) => l.startsWith("-- ")).map((l) => l.split(" | ")[0]!.slice(3));
const parts = (text: string): string[] => text.split(/^(?=-- )/m);
const size = (text: string, id: string): number => [...parts(text).find((x) => x.startsWith(`-- ${id} |`))!].length;

function project(): Project {
  const q = new Project(null);
  q.write("openspec/specs/thing/spec.md", SPEC);
  for (const n of [1, 2, 3]) q.write(`src/c${n}.ts`, `${TAG}TH-001 code ${n}\n`);
  for (const n of [1, 2]) q.write(`tests/t${n}.test.ts`, `// ${COVERS}REQ-TH-001\n`);
  const tasks = [1, 2, 3, 4].map((n) => `- [ ] 1.${n} Task ${n} ${LONG}. [REQ-TH-001] Verify: \`true\``);
  tasks.push(`- [ ] 1.5 Uncited ${LONG}. Verify: \`true\``);
  q.write("openspec/changes/009-add-x/tasks.md", "# Tasks\n\n" + tasks.join("\n") + "\n");
  q.write("openspec/changes/009-add-x/specs/thing/spec.md", "## ADDED Requirements\n\n" + [2, 3, 4].map(DELTA).join("\n"));
  return q;
}

async function bundleOf(q: Project, budget: number, ...args: string[]): Promise<{ text: string; omitted: string[] }> {
  const r = await q.run("bundle", ...args, "--budget", String(budget), "--json");
  expect(r.code, r.err).toBe(0);
  return JSON.parse(r.out);
}

describe("task reach", () => {
  test("SCN-QRY-016-1 the cited requirement and its lines come first", async () => {
    p = project();
    const b = await bundleOf(p, 1100, "009/1.1");
    const h = heads(b.text);
    for (const f of ["REQ-TH-001", "src/c1.ts:1", "src/c2.ts:1", "src/c3.ts:1", "tests/t1.test.ts:1", "tests/t2.test.ts:1"]) expect(h).toContain(f);
    expect(b.omitted.length).toBeGreaterThan(0);
    expect(b.omitted.every((i) => /^\d+\/\d/.test(i) || /^REQ-TH-0[2-4]0$/.test(i) || i.startsWith("change/") || i.startsWith("cap/"))).toBe(true);
    const full = await bundleOf(p, 100000, "009/1.1");
    expect(full.text).toContain("| implements REQ-TH-001\n");
    expect(full.text).toContain("| covers REQ-TH-001\n");
    expect(full.text).toContain("| ref from 009/1.1\n");
  });

  test("SCN-QRY-016-3 a task with no citation gets no code or test line", async () => {
    p = project();
    const b = await bundleOf(p, 100000, "009/1.5");
    const h = heads(b.text);
    expect(h).toContain("009/1.5");
    expect(h).toContain("REQ-TH-020");
    expect(h.some((x) => x.startsWith("src/") || x.startsWith("tests/"))).toBe(false);
  });

  for (const depth of [1, 2]) {
    test(`SCN-QRY-016-4 the decision for a cited requirement stays at depth ${depth}`, async () => {
      p = project();
      p.write("openspec/changes/009-add-x/design.md", "# Design\n\n## Decisions\n\n- D1 Pick one. Refs: REQ-TH-001\n");
      const full = await bundleOf(p, 100000, "009/1.1", "--depth", String(depth));
      // room for the decision, or for one delta, but not for both: a class 3 decision then drops before the delta
      const budget = ["009/1.1", "REQ-TH-001", "009/D1", "REQ-TH-020", "src/c1.ts:1", "src/c2.ts:1", "src/c3.ts:1", "tests/t1.test.ts:1", "tests/t2.test.ts:1"].reduce((n, id) => n + size(full.text, id), 0) - 1;
      const b = await bundleOf(p, budget, "009/1.1", "--depth", String(depth));
      expect(b.text).toContain("-- 009/D1 |");
      expect(b.text).toContain("| decision for REQ-TH-001\n");
      expect(b.omitted).not.toContain("009/D1");
    });
  }

  test("SCN-QRY-016-5 the decision of a second requested ID keeps depth 1 at depth 2", async () => {
    p = project();
    // the first requirement refs the second, so the walk for the first ID reaches the decision of the second at depth 2
    p.write("openspec/changes/009-add-x/design.md", "# Design\n\n## Decisions\n\n- D1 Pick one. Refs: REQ-TH-002\n");
    const ids = ["REQ-TH-001", "REQ-TH-002"];
    const one = await bundleOf(p, 100000, ...ids, "--depth", "1");
    expect(one.text).toContain("| decision for REQ-TH-002\n");
    const two = await bundleOf(p, 100000, ...ids, "--depth", "2");
    expect(two.text).toContain("| decision for REQ-TH-002\n");
    // room for the decision, or for one task that cites REQ-TH-001, but not for both
    const budget = ["REQ-TH-001", "REQ-TH-002", "cap/thing", "009/D1", "009/1.1", "src/c1.ts:1", "src/c2.ts:1", "src/c3.ts:1", "tests/t1.test.ts:1", "tests/t2.test.ts:1"].reduce((n, id) => n + size(one.text, id), 0) - 1;
    for (const depth of ["1", "2"]) {
      const b = await bundleOf(p, budget, ...ids, "--depth", depth);
      expect(b.text).toContain("| decision for REQ-TH-002\n");
      expect(b.omitted).not.toContain("009/D1");
    }
  });

  test("a shared task number reads the entry that the caller passes", async () => {
    p = project();
    // the archived copy comes later in the index and cites another requirement
    p.write("openspec/changes/archive/2026-01-02-009-add-x/tasks.md", "# Tasks\n\n- [x] 1.1 Old. [REQ-TH-002] Verify: `true`\n");
    const idx = await p.build();
    const mine = idx.entries.filter((e: any) => e.kind === "task" && e.id === "009/1.1");
    expect(mine.length).toBe(2);
    const { bundle } = await import("../../src/graph/bundle.ts");
    const active = mine.find((e: any) => !e.file.includes("/archive/"));
    const old = mine.find((e: any) => e.file.includes("/archive/"));
    const a = bundle(p.path("."), idx.entries, ["009/1.1"], 100000, 1, { task: active });
    expect(heads(a.text)).toContain("src/c1.ts:1");
    expect(a.text).toContain("| ref from 009/1.1\n");
    const o = bundle(p.path("."), idx.entries, ["009/1.1"], 100000, 1, { task: old });
    expect(heads(o.text)).not.toContain("src/c1.ts:1");
  });

  test("SCN-QRY-016-2 this repository, on a temp copy", async () => {
    p = new Project(null);
    for (const d of ["openspec", "src", "decisions"]) cpSync(join(REPO, d), p.path(d), { recursive: true });
    cpSync(join(REPO, "tests"), p.path("tests"), { recursive: true, filter: (s) => !s.startsWith(join(REPO, "tests/fixtures")) });
    cpSync(join(REPO, "spec-ctx.toml"), p.path("spec-ctx.toml"));
    const idx = await p.build();
    const want = idx.entries
      .filter((e: any) => (e.kind === "code" || e.kind === "test") && e.refs.includes("REQ-QRY-006"))
      .map((e: any) => `${e.file}:${e.line}`);
    expect(want.length).toBeGreaterThan(1);
    const r = await p.run("bundle", "045/2.1", "--json");
    expect(r.code, r.err).toBe(0);
    const h = heads(JSON.parse(r.out).text);
    for (const w of want) expect(h, w).toContain(w);
  });
});

describe("file reach", () => {
  test("SCN-QRY-017-1 a file and its own tests", async () => {
    p = new Project(null);
    p.write("openspec/specs/ab/spec.md", "### Requirement: REQ-AB-001 Thing\nThe thing SHALL work.\n");
    p.write("src/a.ts", `${TAG}AB-001 code\n`);
    p.write("tests/a.test.ts", `// ${COVERS}REQ-AB-001\n`);
    const r = await p.run("bundle", "src/a.ts");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("-- src/a.ts:1 | src/a.ts:1 | active | implements REQ-AB-001\n");
    expect(r.out).toContain("-- tests/a.test.ts:1 | tests/a.test.ts:1 | active | covers REQ-AB-001\n");
    const rel = await p.run("related", "src/a.ts");
    expect(rel.out.split("\n").some((l) => l.startsWith("code  ") || l.startsWith("test  "))).toBe(false);
  });

  test("SCN-QRY-017-3 a task mention adds no lines", async () => {
    p = new Project(null);
    p.write("openspec/specs/ab/spec.md", "### Requirement: REQ-AB-001 Thing\nThe thing SHALL work.\n");
    p.write("src/a.ts", `${TAG}AB-001 code\n`);
    p.write("src/m.ts", "export const m = 1;\n");
    p.write("openspec/changes/009-add-x/tasks.md", "# Tasks\n\n- [ ] 1.1 Edit `src/m.ts`. [REQ-AB-001] Verify: `true`\n");
    const r = await p.run("bundle", "src/m.ts", "--json");
    expect(r.code, r.err).toBe(0);
    const h = heads(JSON.parse(r.out).text);
    expect(h).toContain("009/1.1");
    expect(h.some((x) => x.startsWith("src/") || x.startsWith("tests/"))).toBe(false);
    const rel = await p.run("related", "src/m.ts");
    expect(rel.out.split("\n").some((l) => l.startsWith("code  ") || l.startsWith("test  "))).toBe(false);
  });
});
