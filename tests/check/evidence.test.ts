// Covers: REQ-CHK-003
import { afterEach, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const TASKS = "openspec/changes/002-t/tasks.md";

function setup(): Project {
  const pr = new Project();
  pr.write(TASKS, "# Tasks\n\n- [ ] 2.1 Do. [REQ-AAA-001] Verify: `true`\n- [ ] 2.2 Two. [REQ-AAA-002] Verify: `true`\n");
  return pr;
}

describe("evidence rules", () => {
  test("SCN-CHK-003-1 evidence with matching digests gives 0 findings", async () => {
    p = setup();
    // the base fixture holds .ctx/evidence/001/1.1.json for the ticked task 001/1.1
    expect(p.read(".ctx/evidence/001/1.1.json")).toContain('"task": "001/1.1"');
    expect((await p.run("task", "done", "002/2.1")).code).toBe(0);
    const r = await p.run("check", "--strict");
    // the base fixture evidence for 001/1.1 is manual, so strict prints its warning
    expect(r.out).toBe("warning: manual-evidence 001/1.1\n\n1 finding in 1 file (0 hard, 1 advisory)\nmanual-evidence  1  Give the task a Verify command and run specctx task done again.\n");
  });

  test("SCN-CHK-003-2 a task ticked by hand is done-without-evidence", async () => {
    p = setup();
    p.write(TASKS, p.read(TASKS).replace("- [ ] 2.1", "- [x] 2.1"));
    expect((await p.run("check")).code).toBe(0);
    const r = await p.run("check", "--strict");
    expect(r.code).toBe(1);
    expect(r.out).toContain(`${TASKS}:3  done-without-evidence  002/2.1`);
  });

  test("SCN-CHK-003-3 a tagged file that changed after done is stale-evidence", async () => {
    p = setup();
    await p.run("task", "done", "002/2.1");
    p.append("src/a.ts", "export const b = 2;\n");
    const r = await p.run("check", "--strict");
    expect(r.code).toBe(1);
    expect(r.out).toContain(".ctx/evidence/002/2.1.json:1  stale-evidence  002/2.1 src/a.ts");
  });

  test("evidence for an open task is evidence-without-done", async () => {
    p = setup();
    await p.run("task", "done", "002/2.1");
    p.write(TASKS, p.read(TASKS).replace("- [x] 2.1", "- [ ] 2.1"));
    const r = await p.run("check", "--strict");
    expect(r.out).toContain(".ctx/evidence/002/2.1.json:1  evidence-without-done  002/2.1");
  });

  test("SCN-CHK-003-4 manual evidence in an active change warns and exits 0", async () => {
    p = setup();
    expect((await p.run("task", "done", "002/2.1", "--manual", "checked by eye")).code).toBe(0);
    const r = await p.run("check", "--strict");
    expect(r.code).toBe(0);
    expect(r.out).toContain("warning: manual-evidence 002/2.1\n");
    expect(r.out).toContain("warning: manual-evidence 001/1.1\n");
    expect(r.out).toContain("\n2 findings in 2 files (0 hard, 2 advisory)\nmanual-evidence  2  ");
    const j = JSON.parse((await p.run("check", "--strict", "--json")).out);
    expect(j).toMatchObject({ count: 0, warnings: ["manual-evidence 001/1.1", "manual-evidence 002/2.1"] });
    expect((await p.run("check")).out).not.toContain("warning");
  });

  test("archived changes are exempt from stale-evidence", async () => {
    p = setup();
    await p.run("task", "done", "002/2.1");
    await p.run("task", "done", "002/2.2");
    const { mkdirSync, renameSync } = await import("node:fs");
    mkdirSync(p.path("openspec/changes/archive"), { recursive: true });
    renameSync(p.path("openspec/changes/002-t"), p.path("openspec/changes/archive/2026-10-24-002-t"));
    p.append("src/a.ts", "export const b = 2;\n");
    const r = await p.run("check", "--strict");
    expect(r.out).not.toContain("stale-evidence  002/2.1");
  });
});
