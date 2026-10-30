// Covers: REQ-QRY-015, REQ-QRY-017
import { cpSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { COVERS, Project, REPO, TAG } from "../helpers.ts";

let p: Project | undefined;
afterEach(() => {
  p?.cleanup();
  p = undefined;
});

function project(): Project {
  const q = new Project(null);
  q.write("openspec/specs/ab/spec.md", "### Requirement: REQ-AB-001 Thing\nThe thing SHALL work.\n\n#### Scenario: SCN-AB-001-1 Works\n- **WHEN** a\n- **THEN** b\n");
  q.write("src/a.ts", `${TAG}AB-001 code\n`);
  q.write("tests/a.test.ts", `// ${COVERS}REQ-AB-001\n`);
  q.write("openspec/changes/009-add-x/tasks.md", "# Tasks\n\n- [ ] 1.1 Edit `src/a.ts`. [REQ-AB-001] Verify: `true`\n");
  return q;
}

describe("context", () => {
  test("SCN-QRY-015-1 four kinds of input give the answer of bundle", async () => {
    p = project();
    for (const input of ["009/1.1", "REQ-AB-001", "src/a.ts", "009-add-x"]) {
      const c = await p.run("context", input);
      const b = await p.run("bundle", input);
      expect(c.code, c.err).toBe(0);
      expect(c.out.length, input).toBeGreaterThan(0);
      expect(c.out, input).toBe(b.out);
      const cj = JSON.parse((await p.run("context", input, "--json")).out);
      const bj = JSON.parse((await p.run("bundle", input, "--json")).out);
      expect(cj.text).toBe(bj.text);
      expect(cj.omitted).toEqual(bj.omitted);
    }
    const small = await p.run("context", "009/1.1", "--budget", "200", "--depth", "2");
    expect(small.out).toBe((await p.run("bundle", "009/1.1", "--budget", "200", "--depth", "2")).out);
  });

  test("SCN-QRY-015-2 one input only", async () => {
    p = project();
    const none = await p.run("context");
    expect([none.code, none.out]).toEqual([2, ""]);
    expect(none.err).toContain("context needs");
    const two = await p.run("context", "REQ-AB-001", "src/a.ts");
    expect([two.code, two.out]).toEqual([2, ""]);
    expect(two.err).toContain("context takes one");
  });

  test("SCN-QRY-015-3 an unknown input names itself", async () => {
    p = project();
    await p.build();
    const c = await p.run("context", "REQ-NOPE-001");
    const b = await p.run("bundle", "REQ-NOPE-001");
    expect([c.code, c.out]).toEqual([2, ""]);
    expect(c.err).toContain("REQ-NOPE-001");
    expect(c.err).toBe(b.err);
  });

  test("SCN-QRY-017-2 this repository, on a temp copy", async () => {
    p = new Project(null);
    for (const d of ["openspec", "src", "decisions"]) cpSync(join(REPO, d), p.path(d), { recursive: true });
    cpSync(join(REPO, "tests"), p.path("tests"), { recursive: true, filter: (s) => !s.startsWith(join(REPO, "tests/fixtures")) });
    cpSync(join(REPO, "spec-ctx.toml"), p.path("spec-ctx.toml"));
    const idx = await p.build();
    const tagged = new Set<string>();
    for (const e of idx.entries) if ((e.kind === "code" || e.kind === "test") && e.file === "src/graph/files.ts") for (const r of e.refs) tagged.add(r);
    const want = idx.entries
      .filter((e: any) => (e.kind === "code" || e.kind === "test") && e.refs.some((r: string) => tagged.has(r)))
      .map((e: any) => `${e.file}:${e.line}`);
    expect(want.length).toBeGreaterThan(1);
    const r = await p.run("context", "src/graph/files.ts", "--json");
    expect(r.code, r.err).toBe(0);
    const h = new Set(JSON.parse(r.out).text.split("\n").filter((l: string) => l.startsWith("-- ")).map((l: string) => l.split(" | ")[0]!.slice(3)));
    for (const w of want) expect(h.has(w), w).toBe(true);
  });
});
