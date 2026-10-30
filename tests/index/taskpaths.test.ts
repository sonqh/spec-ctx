// Covers: REQ-IDX-009, SCN-IDX-009-1, SCN-IDX-009-2
import { afterEach, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const TASKS = (line: string): string => `# Tasks\n\n## 1. Group\n\n- [ ] 1.1 ${line}\n`;

async function pathsOf(dir: string, line: string): Promise<unknown> {
  p?.cleanup();
  p = new Project(null);
  p.write("openspec/specs/ab/spec.md", "### Requirement: REQ-AB-001 Thing\nText.\n");
  p.write(`${dir}/tasks.md`, TASKS(line));
  const idx = await p.build();
  const t = idx.entries.find((e: any) => e.kind === "task");
  expect(t).toBeDefined();
  return t.paths;
}

describe("task paths", () => {
  test("SCN-IDX-009-1 only path-like code spans of an active task", async () => {
    const line = "Edit `src/a.ts`, `./b.md`, `bun test`, and `src/**`. Run `node` with `--depth`. [REQ-AB-001] Verify: `bun test tests/x.test.ts`";
    expect(await pathsOf("openspec/changes/001-x", line)).toEqual(["b.md", "src/a.ts"]);
  });

  test("SCN-IDX-009-1 a repeated path counts once and a bare file name with a dot counts", async () => {
    expect(await pathsOf("openspec/changes/001-x", "Edit `src/a.ts` and `src/a.ts` and `README.md`. [REQ-AB-001] Verify: `true`"))
      .toEqual(["README.md", "src/a.ts"]);
  });

  test("a task with no path has no paths key", async () => {
    expect(await pathsOf("openspec/changes/001-x", "Do it. [REQ-AB-001] Verify: `true`")).toBeUndefined();
  });

  test("SCN-IDX-009-2 an archived task has no paths key", async () => {
    expect(await pathsOf("openspec/changes/archive/2026-10-30-001-x", "Edit `src/a.ts`. [REQ-AB-001] Verify: `true`")).toBeUndefined();
  });
});
