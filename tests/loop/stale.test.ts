// Covers: REQ-LOOP-008, REQ-CHK-003
import { rmSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { OPENSPEC_STUB, Project } from "../helpers.ts";

// Stale evidence in next (031/D4, 031/D5). The base fixture tags src/a.ts with REQ-AAA-001.

let p: Project;
beforeEach(() => {
  process.env.SPECCTX_OPENSPEC = OPENSPEC_STUB;
  p = new Project();
  rmSync(p.path(".ctx/evidence/001/1.1.json"));
  p.write("openspec/changes/001-x/tasks.md", [
    "# Tasks", "", "## 1. Alpha", "",
    "- [ ] 1.1 A. [REQ-AAA-001] Verify: `test -d openspec`",
    "- [ ] 1.2 B. [REQ-AAA-001] Verify: `test -d openspec`", "",
    "## 2. Beta", "",
    "- [ ] 2.1 C. [REQ-AAA-002] Verify: `test -d openspec`", "",
  ].join("\n"));
});
afterEach(() => {
  delete process.env.SPECCTX_OPENSPEC;
  p?.cleanup();
});

async function next(): Promise<Record<string, unknown>> {
  const r = await p.run("next", "--json");
  expect(r.code, r.err).toBe(0);
  return JSON.parse(r.out) as Record<string, unknown>;
}

async function closeAlpha(): Promise<void> {
  for (const t of ["001/1.1", "001/1.2"]) {
    const d = await p.run("task", "done", t);
    expect(d.code, d.out + d.err).toBe(0);
  }
  p.append("src/a.ts", "export const later = 2;\n");
}

const REPAIR_ONE = 'specctx task reopen 001/1.1 "stale evidence: src/a.ts" && specctx task done 001/1.1';
const REPAIR_BOTH = REPAIR_ONE + ' && specctx task reopen 001/1.2 "stale evidence: src/a.ts" && specctx task done 001/1.2';

describe("stale evidence in next", () => {
  test("SCN-LOOP-008-1 next returns repair for every stale task, the earliest first", async () => {
    await closeAlpha();
    expect(await next()).toEqual({
      action: "repair", attempt: 0, change: "001-x", command: REPAIR_BOTH, human: false, max_attempts: 3,
      reason: "stale-evidence 001/1.1 src/a.ts, stale-evidence 001/1.2 src/a.ts", state: "evidence_stale", task: "001/1.1", tasks: ["001/1.1", "001/1.2"],
    });
  });

  test("SCN-LOOP-008-3 one stale task gives a one item list and no chain", async () => {
    const d = await p.run("task", "done", "001/1.2");
    expect(d.code, d.out + d.err).toBe(0);
    p.append("src/a.ts", "export const later = 2;\n");
    expect(await next()).toMatchObject({
      action: "repair", task: "001/1.2", tasks: ["001/1.2"], reason: "stale-evidence 001/1.2 src/a.ts",
      command: 'specctx task reopen 001/1.2 "stale evidence: src/a.ts" && specctx task done 001/1.2',
    });
  });

  test("SCN-LOOP-008-2 a current task keeps work, and the repair command clears the stale task", async () => {
    await closeAlpha();
    expect((await p.run("task", "start", "001/2.1")).code).toBe(0);
    expect(await next()).toMatchObject({ action: "work", task: "001/2.1" });
    rmSync(p.path(".ctx/current.json"));
    expect((await p.run("task", "reopen", "001/1.1", "stale evidence: src/a.ts")).code).toBe(0);
    expect((await p.run("task", "done", "001/1.1")).code).toBe(0);
    const n = await next();
    expect(n).toMatchObject({ action: "repair", task: "001/1.2" });
    expect((await p.run("task", "reopen", "001/1.2", "stale evidence: src/a.ts")).code).toBe(0);
    expect((await p.run("task", "done", "001/1.2")).code).toBe(0);
    expect(await next()).toMatchObject({ action: "start", task: "001/2.1" });
    const c = await p.run("check", "--strict");
    expect(c.out).not.toContain("stale-evidence");
  });
});
