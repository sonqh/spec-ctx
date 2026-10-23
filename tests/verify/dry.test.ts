// Covers: REQ-VER-002
import { afterEach, describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const TASKS = "openspec/changes/002-t/tasks.md";

describe("task verify", () => {
  test("SCN-VER-002-1 a dry run writes nothing", async () => {
    p = new Project();
    p.write(TASKS, "# Tasks\n\n## 2. Runner\n\n- [ ] 2.1 Echo. [REQ-AAA-001] Verify: `echo hello && echo warn >&2`\n");
    const before = readFileSync(p.path(TASKS));
    const r = await p.run("task", "verify", "002/2.1");
    expect(r.code).toBe(0);
    expect(r.out).toContain("hello");
    expect(r.out).toContain("warn");
    expect(r.out.endsWith("exit 0\n")).toBe(true);
    expect(readFileSync(p.path(TASKS)).equals(before)).toBe(true);
    expect(existsSync(p.path(".ctx/evidence/002"))).toBe(false);
  });

  test("a failing command prints its exit code and exits 1", async () => {
    p = new Project();
    p.write(TASKS, "# Tasks\n\n- [ ] 2.1 Fail. [REQ-AAA-001] Verify: `echo nope && exit 4`\n");
    const r = await p.run("task", "verify", "002/2.1");
    expect(r.code).toBe(1);
    expect(r.out).toBe("nope\nexit 4\n");
    const j = JSON.parse((await p.run("task", "verify", "002/2.1", "--json")).out);
    expect(j).toMatchObject({ command: "echo nope && exit 4", exit: 4, tail: "nope" });
  });

  test("a task with prose Verify has nothing to run", async () => {
    p = new Project();
    expect((await p.run("task", "verify", "001/1.2")).code).toBe(2);
    expect((await p.run("task", "verify", "009/9.9")).code).toBe(2);
  });
});
