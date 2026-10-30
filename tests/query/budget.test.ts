// Covers: REQ-QRY-012, REQ-QRY-014
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { COVERS, Project, REPO, TAG } from "../helpers.ts";

let p: Project | undefined;
afterEach(() => {
  p?.cleanup();
  p = undefined;
});

const SPEC = "### Requirement: REQ-TH-001 Thing\nThe thing SHALL work.\n\nRefs: REQ-TH-002\n\n#### Scenario: SCN-TH-001-1 Works\n- **WHEN** a\n- **THEN** b\n\n### Requirement: REQ-TH-002 Next\nNext SHALL work.\n\nRefs: REQ-TH-005\n\n### Requirement: REQ-TH-005 Far\nFar SHALL work.\n";
const LONG = "x".repeat(300);

function project(): Project {
  const q = new Project(null);
  q.write("openspec/specs/thing/spec.md", SPEC);
  for (const n of [1, 2, 3]) q.write(`src/c${n}.ts`, `${TAG}TH-001 code ${n}\n`);
  for (const n of [1, 2]) q.write(`tests/t${n}.test.ts`, `// ${COVERS}REQ-TH-001\n`);
  const tasks = [1, 2, 3, 4, 5, 6].map((n) => `- [ ] 1.${n} Task ${n} ${LONG}. [REQ-TH-001] Verify: \`true\``);
  q.write("openspec/changes/009-add-x/tasks.md", "# Tasks\n\n" + tasks.join("\n") + "\n");
  return q;
}

const heads = (text: string): string[] => text.split("\n").filter((l) => l.startsWith("-- ")).map((l) => l.split(" | ")[0]!.slice(3));

describe("budget order", () => {
  test("SCN-QRY-012-1 code and test lines first", async () => {
    p = project();
    const r = await p.run("bundle", "REQ-TH-001", "--budget", "1000", "--json");
    expect(r.code, r.err).toBe(0);
    const b = JSON.parse(r.out) as { text: string; omitted: string[] };
    const h = heads(b.text);
    for (const f of ["src/c1.ts:1", "src/c2.ts:1", "src/c3.ts:1", "tests/t1.test.ts:1", "tests/t2.test.ts:1"]) expect(h).toContain(f);
    expect(b.omitted.length).toBeGreaterThan(0);
    expect(b.omitted.every((i) => /^\d+\/\d/.test(i) || i.startsWith("REQ-"))).toBe(true);
    expect(b.omitted.some((i) => /^\d+\/\d/.test(i))).toBe(true);
  });

  test("SCN-QRY-012-2 this repository, on a temp copy", async () => {
    p = new Project(null);
    for (const d of ["openspec", "src", "decisions"]) cpSync(join(REPO, d), p.path(d), { recursive: true });
    cpSync(join(REPO, "tests"), p.path("tests"), { recursive: true, filter: (s) => !s.startsWith(join(REPO, "tests/fixtures")) });
    cpSync(join(REPO, "spec-ctx.toml"), p.path("spec-ctx.toml"));
    const idx = await p.build();
    const want = idx.entries
      .filter((e: any) => (e.kind === "code" || e.kind === "test") && e.refs.includes("REQ-LOOP-001"))
      .map((e: any) => `${e.file}:${e.line}`);
    expect(want.length).toBeGreaterThan(4);
    const r = await p.run("bundle", "REQ-LOOP-001", "--json");
    expect(r.code, r.err).toBe(0);
    const h = heads(JSON.parse(r.out).text);
    for (const w of want) expect(h, w).toContain(w);
  });

  test("SCN-QRY-012-3 decisions for a requested ID", async () => {
    p = new Project(null);
    p.write("openspec/specs/thing/spec.md", SPEC);
    const design = "# Design\n\n## Decisions\n\n- D1 Pick one. Refs: REQ-TH-001\n";
    p.write("openspec/changes/009-add-x/design.md", design);
    p.write("openspec/changes/archive/2026-01-02-008-old/design.md", design);
    const full = JSON.parse((await p.run("bundle", "REQ-TH-001", "--budget", "100000", "--json")).out).text as string;
    const parts = full.split(/^(?=-- )/m);
    const size = (id: string): number => [...parts.find((x) => x.startsWith(`-- ${id} |`))!].length;
    const budget = size("REQ-TH-001") + size("009/D1") + 5;
    const b = JSON.parse((await p.run("bundle", "REQ-TH-001", "--budget", String(budget), "--json")).out) as { text: string; omitted: string[] };
    expect(heads(b.text)).toContain("009/D1");
    expect(heads(b.text)).not.toContain("008/D1");
    expect(b.omitted).toContain("008/D1");
  });
});

describe("omitted trailer", () => {
  test("SCN-QRY-014-1 print order, not class order", async () => {
    p = project();
    const one = JSON.parse((await p.run("bundle", "REQ-TH-001", "--budget", "100000", "--depth", "2", "--json")).out).text as string;
    const first = one.split(/^(?=-- )/m).find((x) => x.startsWith("-- REQ-TH-001 |"))!;
    const r = await p.run("bundle", "REQ-TH-001", "--budget", String([...first].length + 3), "--depth", "2", "--json");
    const b = JSON.parse(r.out) as { text: string; omitted: string[] };
    // The far requirement sits at depth 2 (class 3) and a task at depth 1 (class 2). The trailer follows the print order.
    expect(b.omitted.indexOf("REQ-TH-005")).toBeGreaterThan(-1);
    expect(b.omitted.indexOf("REQ-TH-005")).toBeLessThan(b.omitted.indexOf("009/1.1"));
    expect(b.text.trimEnd().split("\n").pop()).toBe(`truncated: ${b.omitted.length} entries omitted: ${b.omitted.join(", ")}`);
  });
});
