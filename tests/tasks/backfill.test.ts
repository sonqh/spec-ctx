// Covers: REQ-TASK-006
import { afterEach, describe, expect, test } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const ticked = (n: number, from = 1): string =>
  Array.from({ length: n }, (_, i) => `- [x] 1.${i + from} Task ${i + from}. [REQ-AAA-001] Verify: \`true\`\n`).join("");

describe("task backfill", () => {
  test("SCN-TASK-006-1 two active changes with 5 and 7 ticked tasks", async () => {
    p = new Project();
    p.write("openspec/changes/010-five/tasks.md", "# Tasks\n\n" + ticked(5));
    p.write("openspec/changes/011-seven/tasks.md", "# Tasks\n\n" + ticked(7));
    const r = await p.run("task", "backfill", "--manual", "adopted");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toBe("010-five: 5\n011-seven: 7\nbackfilled 12 task(s)\n");
    expect(readdirSync(p.path(".ctx/evidence/010"))).toHaveLength(5);
    expect(readdirSync(p.path(".ctx/evidence/011"))).toHaveLength(7);
    const ev = JSON.parse(p.read(".ctx/evidence/011/1.7.json"));
    expect(ev).toMatchObject({ kind: "manual", note: "adopted", task: "011/1.7" });
    // a second run finds nothing
    expect((await p.run("task", "backfill", "--manual", "adopted")).out).toBe("backfilled 0 task(s)\n");
  });

  test("SCN-TASK-006-2 a task with command evidence keeps its file", async () => {
    p = new Project();
    p.write("openspec/changes/002-t/tasks.md", "# Tasks\n\n- [ ] 2.1 Run. [REQ-AAA-001] Verify: `true`\n- [x] 2.2 Ticked. [REQ-AAA-001] Verify: `true`\n");
    expect((await p.run("task", "done", "002/2.1")).code).toBe(0);
    const before = readFileSync(p.path(".ctx/evidence/002/2.1.json"));
    const fixture = readFileSync(p.path(".ctx/evidence/001/1.1.json"));
    const r = await p.run("task", "backfill", "--manual", "adopted");
    expect(r.out).toBe("002-t: 1\nbackfilled 1 task(s)\n");
    expect(readFileSync(p.path(".ctx/evidence/002/2.1.json")).equals(before)).toBe(true);
    expect(readFileSync(p.path(".ctx/evidence/001/1.1.json")).equals(fixture)).toBe(true);
    expect(JSON.parse(p.read(".ctx/evidence/002/2.2.json")).kind).toBe("manual");
  });

  test("SCN-TASK-006-3 an archived change gets no evidence", async () => {
    p = new Project();
    p.write("openspec/changes/010-five/tasks.md", "# Tasks\n\n" + ticked(2));
    p.write("openspec/changes/archive/2026-10-02-011-seven/tasks.md", "# Tasks\n\n" + ticked(3));
    const r = await p.run("task", "backfill", "--manual", "adopted");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toBe("010-five: 2\nbackfilled 2 task(s)\n");
    expect(readdirSync(p.path(".ctx/evidence/010"))).toHaveLength(2);
    expect(existsSync(p.path(".ctx/evidence/011"))).toBe(false);
    // --change on the archived change finds nothing
    expect((await p.run("task", "backfill", "--manual", "adopted", "--change", "011")).out).toBe("backfilled 0 task(s)\n");
  });

  test("--change narrows the run and a note is required", async () => {
    p = new Project();
    p.write("openspec/changes/010-five/tasks.md", "# Tasks\n\n" + ticked(2));
    p.write("openspec/changes/011-seven/tasks.md", "# Tasks\n\n" + ticked(3));
    expect((await p.run("task", "backfill", "--manual", "x", "--change", "011")).out).toBe("011-seven: 3\nbackfilled 3 task(s)\n");
    expect((await p.run("task", "backfill")).code).toBe(2);
  });
});
