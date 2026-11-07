// Covers: REQ-QRY-021, REQ-QRY-019, REQ-QRY-014, SCN-QRY-021-1, SCN-QRY-021-2, SCN-QRY-021-3
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
}
const heads = (t: string): string[] => t.split("\n").filter((l) => l.startsWith("-- ")).map((l) => l.split(" | ")[0]!.slice(3));

function project(dir = "openspec/changes/009-add-x"): Project {
  const q = new Project(null);
  q.write("openspec/specs/thing/spec.md", "### Requirement: REQ-TH-001 Thing\nThe thing SHALL work.\n");
  q.write("src/a.ts", "const a = 1;\n");
  q.write("src/b.ts", `${TAG}TH-001 tagged\n`);
  q.write(`${dir}/tasks.md`, "# Tasks\n\n- [ ] 1.1 Edit `src/a.ts`, `src/zz.ts`, and `src/b.ts`. [REQ-TH-001] Verify: `true`\n");
  return q;
}

async function context(q: Project, id: string, ...args: string[]): Promise<B> {
  const r = await q.run("context", id, "--json", ...args);
  expect(r.code, r.err).toBe(0);
  return JSON.parse(r.out) as B;
}

describe("named paths", () => {
  test("SCN-QRY-021-1 a named file gets a card after the implements line", async () => {
    p = project();
    const b = await context(p, "009/1.1");
    const ls = b.text.split("\n");
    const named = ls.indexOf("-- src/a.ts | src/a.ts | active | named by 009/1.1 | declared");
    expect(named).toBeGreaterThan(0);
    const impl = ls.findIndex((l) => l.startsWith("-- src/b.ts:1 ") && l.includes("implements REQ-TH-001"));
    expect(impl).toBeGreaterThan(0);
    expect(named).toBeGreaterThan(impl);
  });

  test("REQ-QRY-021 the named cards stay after the requirements when a change is requested with the task", async () => {
    p = project();
    const r = await p.run("bundle", "009-add-x", "009/1.1", "--json");
    expect(r.code, r.err).toBe(0);
    const ls = (JSON.parse(r.out) as B).text.split("\n");
    const named = ls.indexOf("-- src/a.ts | src/a.ts | active | named by 009/1.1 | declared");
    const req = ls.findIndex((l) => l.startsWith("-- REQ-TH-001 "));
    const impl = ls.findIndex((l) => l.startsWith("-- src/b.ts:1 "));
    expect(named).toBeGreaterThan(req);
    expect(named).toBeGreaterThan(impl);
  });

  test("SCN-QRY-021-2 a missing path and a file with a line print no card", async () => {
    p = project();
    const b = await context(p, "009/1.1");
    expect(b.text).not.toContain("src/zz.ts |");
    expect(heads(b.text).filter((h) => h.startsWith("src/b.ts"))).toEqual(["src/b.ts:1"]);
  });

  test("SCN-QRY-021-3 a task of an archived change gets the card too", async () => {
    p = project("openspec/changes/archive/2026-10-30-003-old");
    const idx = await p.build();
    const t = idx.entries.find((e: any) => e.kind === "task");
    const b = await context(p, t.id);
    expect(b.text).toContain(`-- src/a.ts | src/a.ts | active | named by ${t.id} | declared\n`);
  });

  test("REQ-QRY-019 a named path that loses its card is in omitted, and a path with a lost tagged line gets no card", async () => {
    p = project();
    const b = await context(p, "009/1.1", "--budget", "0");
    expect(b.omitted).toContain("src/a.ts");
    expect(b.omitted).toContain("src/b.ts:1");
    expect(b.omitted).not.toContain("src/b.ts");
    expect(b.omitted).not.toContain("src/zz.ts");
  });

  test("REQ-QRY-014 the named card is part of the print order of the trailer", async () => {
    p = project();
    const b = await context(p, "009/1.1", "--budget", "0");
    expect(b.omitted.indexOf("src/b.ts:1")).toBeLessThan(b.omitted.indexOf("src/a.ts"));
  });
});
