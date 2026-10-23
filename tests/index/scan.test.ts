// Covers: REQ-IDX-001
import { afterEach, describe, expect, test } from "vitest";
import { Project, COVERS, TAG } from "../helpers.ts";

const ID_RE = /\b(REQ-[A-Z]+-\d{3}|SCN-[A-Z]+-\d{3}-\d+|ADR-\d{3})\b/g;
let p: Project;
afterEach(() => p?.cleanup());

describe("scan", () => {
  test("SCN-IDX-001-1 every REQ, SCN, ADR, task, and decision ID is in the index", async () => {
    p = new Project();
    const idx = await p.build();
    const ids = new Set(idx.entries.map((e: { id: string }) => e.id));
    for (const rel of ["openspec/specs/alpha/spec.md", "openspec/changes/001-x/specs/beta/spec.md", "decisions/ADR-001-sample.md"]) {
      for (const line of p.read(rel).split("\n")) {
        if (/^(### Requirement:|#### Scenario:|# ADR-)/.test(line)) {
          for (const m of line.matchAll(ID_RE)) expect(ids).toContain(m[1]);
        }
      }
    }
    for (const id of ["001/1.1", "001/1.2", "001/D1", "001/D2"]) expect(ids).toContain(id);
  });

  test("SCN-IDX-001-2 a code tag is code and a Covers tag is test", async () => {
    p = new Project(null);
    p.write("openspec/specs/x/spec.md", "### Requirement: REQ-IDX-002 Shape\nText.\n\n#### Scenario: SCN-IDX-002-1 S\n- a\n");
    p.write("src/a.ts", TAG + "IDX-002\nexport const a = 1;\n");
    p.write("tests/a.test.ts", "// " + COVERS + "REQ-IDX-002\n");
    const idx = await p.build();
    const code = idx.entries.filter((e: any) => e.kind === "code");
    const tests = idx.entries.filter((e: any) => e.kind === "test");
    expect(code.map((e: any) => [e.file, e.refs])).toEqual([["src/a.ts", ["REQ-IDX-002"]]]);
    expect(tests.map((e: any) => [e.file, e.refs])).toEqual([["tests/a.test.ts", ["REQ-IDX-002"]]]);
  });

  test("SCN-IDX-001-3 ignore globs keep files out of the index", async () => {
    p = new Project();
    p.write("spec-ctx.toml", '[scan]\nignore = ["tests/fixtures/**"]\n');
    p.write("tests/fixtures/x/b.test.ts", "// " + COVERS + "REQ-AAA-001\n");
    p.write("tests/fixtures/y.md", "x\n");
    const idx = await p.build();
    expect(idx.entries.filter((e: any) => e.file.startsWith("tests/fixtures/"))).toEqual([]);
  });

  test("node_modules and .git are skipped", async () => {
    p = new Project();
    p.write("src/node_modules/y/c.ts", TAG + "AAA-001\n");
    p.write("src/.git/c.ts", TAG + "AAA-001\n");
    const idx = await p.build();
    expect(idx.entries.filter((e: any) => /node_modules|\.git\//.test(e.file))).toEqual([]);
  });

  test("Refs lines and design decisions are extracted", async () => {
    p = new Project();
    const idx = await p.build();
    const by = new Map(idx.entries.map((e: any) => [e.id, e]));
    expect((by.get("REQ-AAA-002") as any).refs).toEqual(["REQ-AAA-001"]);
    expect((by.get("ADR-001") as any).refs).toEqual(["REQ-AAA-001"]);
    const d1 = by.get("001/D1") as any;
    expect(d1.kind).toBe("decision");
    expect(d1.refs).toEqual(["REQ-AAA-002"]);
    expect(d1.title).toBe("Beta reads the lockfile once.");
    expect((by.get("001/D2") as any).refs).toEqual([]);
  });

  test("IDs inside a code fence are not headers", async () => {
    p = new Project();
    p.append("openspec/specs/alpha/spec.md", "\n```\n### Requirement: REQ-AAA-009 Fenced\n```\n");
    const idx = await p.build();
    expect(idx.entries.some((e: any) => e.id === "REQ-AAA-009")).toBe(false);
  });

  test("CRLF files keep their line numbers", async () => {
    p = new Project();
    p.write("openspec/specs/alpha/spec.md", p.read("openspec/specs/alpha/spec.md").replace(/\n/g, "\r\n"));
    const idx = await p.build();
    const e = idx.entries.find((x: any) => x.id === "REQ-AAA-001");
    expect(e.line).toBe(5);
    expect(e.title).toBe("Lockfile writer");
  });

  test("an archived change keeps its name and task IDs", async () => {
    p = new Project();
    const { renameSync, mkdirSync } = await import("node:fs");
    mkdirSync(p.path("openspec/changes/archive"));
    renameSync(p.path("openspec/changes/001-x"), p.path("openspec/changes/archive/2026-10-23-001-x"));
    const idx = await p.build();
    const by = new Map(idx.entries.map((e: any) => [e.id, e]));
    expect((by.get("001/1.1") as any).change).toBe("001-x");
    expect((by.get("REQ-BBB-001") as any).status).toBe("archived");
  });
});
