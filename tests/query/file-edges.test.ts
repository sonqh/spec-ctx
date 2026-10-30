// Covers: REQ-QRY-006, SCN-QRY-006-1, SCN-QRY-006-3
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { fileEdges } from "../../src/graph/files.ts";
import { related } from "../../src/graph/related.ts";
import { COVERS, Project, TAG } from "../helpers.ts";

let p: Project;
let entries: any[];
beforeAll(async () => {
  p = new Project(null);
  const req = (n: string) => `### Requirement: REQ-AB-${n} Thing ${n}\nText.\n\n#### Scenario: SCN-AB-${n}-1 Case\n- a\n\n`;
  p.write("openspec/specs/ab/spec.md", req("001") + req("002") + req("003"));
  p.write("src/a.ts", `${TAG}AB-001, REQ-AB-002 note\nconst x = 1;\n${TAG}AB-001\n`);
  p.write("src/b.ts", "const y = 2;\n");
  p.write("tests/a.test.ts", `// ${COVERS}SCN-AB-001-1, REQ-AB-001 REQ-AB-003\n`);
  p.write("openspec/changes/001-x/tasks.md",
    "# Tasks\n\n- [ ] 1.1 Edit `src/a.ts` and `src/b.ts`. [REQ-AB-003] Verify: `true`\n- [ ] 1.2 Other work. [REQ-AB-002] Verify: `true`\n");
  p.write("openspec/changes/archive/2026-10-30-000-old/tasks.md",
    "# Tasks\n\n- [x] 1.1 Edit `src/b.ts`. [REQ-AB-001] Verify: `true`\n");
  entries = (await p.build()).entries;
});
afterAll(() => p.cleanup());

describe("fileEdges", () => {
  test("SCN-QRY-006-1 implements lists every REQ of a tag line, with the first tag line", () => {
    const e = fileEdges(entries, "src/a.ts");
    expect(e).toContainEqual(["REQ-AB-001", "implements, tag at src/a.ts:1"]);
    expect(e).toContainEqual(["REQ-AB-002", "implements, tag at src/a.ts:1"]);
  });

  test("SCN-QRY-006-1 covers reads the Covers tag of a test file", () => {
    expect(fileEdges(entries, "tests/a.test.ts")).toEqual([
      ["REQ-AB-001", "covers, tag at tests/a.test.ts:1"],
      ["REQ-AB-003", "covers, tag at tests/a.test.ts:1"],
    ]);
  });

  test("SCN-QRY-006-3 mentions comes from the task line of an active change only", () => {
    expect(fileEdges(entries, "src/b.ts")).toEqual([["001/1.1", "mentions, in task line"]]);
  });

  test("a file with a tag and a mention lists the implements group first", () => {
    const e = fileEdges(entries, "src/a.ts");
    expect(e.map((x) => x[0])).toEqual(["REQ-AB-001", "REQ-AB-002", "001/1.1"]);
  });

  test("a file with no link, an unknown file, and an ID that does not exist give no edge", () => {
    expect(fileEdges(entries, "README.md")).toEqual([]);
    expect(fileEdges(entries, "src/none.ts")).toEqual([]);
  });
});

describe("related of a path", () => {
  test("SCN-QRY-006-1 the walk adds scenarios and citing tasks and no code or test row", () => {
    const rows = related(entries, "src/a.ts", 1);
    const ids = rows.map((r) => r[0]);
    expect(ids).toContain("SCN-AB-001-1");
    expect(ids).toContain("001/1.1");
    expect(ids).toContain("001/1.2");
    expect(rows.find((r) => r[0] === "001/1.2")![1]).toBe("task cites REQ-AB-002");
    expect(rows.find((r) => r[0] === "001/1.1")![1]).toBe("mentions, in task line");
    expect(ids.some((i) => i.includes(".ts:") || i.includes(".test.ts:"))).toBe(false);
  });

  test("depth 0 lists the direct links only", () => {
    expect(related(entries, "src/a.ts", 0).map((r) => r[0])).toEqual(["REQ-AB-001", "REQ-AB-002", "001/1.1"]);
  });

  test("an ID still wins over a path", () => {
    expect(related(entries, "REQ-AB-001", 1).some(([, r]) => r.startsWith("implements REQ-AB-001"))).toBe(true);
  });
});
