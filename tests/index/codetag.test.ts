// Covers: REQ-IDX-008, SCN-IDX-008-1, SCN-IDX-008-2
import { afterEach, describe, expect, test } from "vitest";
import { COVERS, Project, TAG } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

/** The code entries of the index as `file:line REQ` strings, sorted. */
async function tagged(file: string, body: string): Promise<string[]> {
  p?.cleanup();
  p = new Project(null);
  p.write("openspec/specs/ab/spec.md", "### Requirement: REQ-AB-001 Thing\nText.\n");
  p.write(file, body);
  const idx = await p.build();
  return idx.entries.filter((e: any) => e.kind === "code").flatMap((e: any) => e.refs.map((r: string) => `${e.file}:${e.line} ${r}`)).sort();
}

describe("the code tag reads every REQ ID on the line", () => {
  test("SCN-IDX-008-1 two IDs on one line", async () => {
    expect(await tagged("src/a.ts", `${TAG}AB-001, REQ-AB-002 note\n`)).toEqual(["src/a.ts:1 REQ-AB-001", "src/a.ts:1 REQ-AB-002"]);
  });

  test("SCN-IDX-008-1 three IDs, a repeated ID, and other comment markers", async () => {
    expect(await tagged("src/a.ts", `${TAG}AB-001 REQ-AB-002; REQ-AB-001 REQ-AB-003\n`)).toEqual([
      "src/a.ts:1 REQ-AB-001", "src/a.ts:1 REQ-AB-002", "src/a.ts:1 REQ-AB-003",
    ]);
    expect(await tagged("src/a.py", "# " + "REQ-AB-001 and REQ-AB-002\n")).toEqual(["src/a.py:1 REQ-AB-001", "src/a.py:1 REQ-AB-002"]);
    expect(await tagged("src/a.ts", "/* " + "REQ-AB-004 */\n * " + "REQ-AB-005 REQ-AB-006\n")).toEqual([
      "src/a.ts:1 REQ-AB-004", "src/a.ts:2 REQ-AB-005", "src/a.ts:2 REQ-AB-006",
    ]);
  });

  test("SCN-IDX-008-2 a four digit suffix does not match", async () => {
    expect(await tagged("src/a.ts", `${TAG}AB-001 REQ-AB-0021\n`)).toEqual(["src/a.ts:1 REQ-AB-001"]);
    expect(await tagged("src/a.ts", `${TAG}AB-0011\n`)).toEqual([]);
    expect(await tagged("src/a.ts", `${TAG}AB-0011 REQ-AB-002\n`)).toEqual([]);
  });

  test("SCN-IDX-008-2 a Covers line is not a code tag", async () => {
    expect(await tagged("tests/a.test.ts", `// ${COVERS}REQ-AB-001, REQ-AB-002\n`)).toEqual([]);
  });

  test("a line with no marker records nothing", async () => {
    expect(await tagged("src/a.ts", "const x = 'REQ-AB-001';\n")).toEqual([]);
  });
});
