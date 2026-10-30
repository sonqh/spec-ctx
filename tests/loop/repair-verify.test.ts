// Covers: REQ-LOOP-013, REQ-LOOP-001
import { rmSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { OPENSPEC_STUB, Project } from "../helpers.ts";

// A ticked task without a Verify command never gets repair (044/D2). The base fixture tags src/a.ts with REQ-AAA-001.

let p: Project;
beforeEach(() => {
  process.env.SPECCTX_OPENSPEC = OPENSPEC_STUB;
  p = new Project();
  rmSync(p.path(".ctx/evidence/001/1.1.json"));
});
afterEach(() => {
  delete process.env.SPECCTX_OPENSPEC;
  p?.cleanup();
});

const TASKS = "openspec/changes/001-x/tasks.md";
const NO_VERIFY = ["# Tasks", "", "## 1. Alpha", "", "- [x] 1.1 A. [REQ-AAA-001]", "- [ ] 1.2 B. [REQ-AAA-001] Verify: `test -d openspec`", ""].join("\n");

async function next(): Promise<Record<string, unknown>> {
  const r = await p.run("next", "--json");
  expect(r.code, r.err).toBe(0);
  return JSON.parse(r.out) as Record<string, unknown>;
}

describe("repair needs a Verify command", () => {
  test("SCN-LOOP-013-1 a baselined task without Verify is skipped", async () => {
    p.write(TASKS, NO_VERIFY);
    p.write(".ctx/baseline.json", JSON.stringify(["task-without-verify 001/1.1"]) + "\n");
    const n = await next();
    expect(n).toMatchObject({ action: "start", task: "001/1.2" });
  });

  test("SCN-LOOP-013-2 an unbaselined task without Verify gets cite", async () => {
    p.write(TASKS, NO_VERIFY);
    const n = await next();
    expect(n).toMatchObject({ action: "cite", task: "001/1.1", state: "citation_missing" });
    expect(n.action).not.toBe("repair");
  });

  test("SCN-LOOP-013-3 done-without-evidence in the baseline does not give repair", async () => {
    p.write(TASKS, NO_VERIFY);
    p.write(".ctx/baseline.json", JSON.stringify(["done-without-evidence 001/1.1"]) + "\n");
    const n = await next();
    expect(n.action).toBe("cite");
    expect(n.command).not.toContain("task done");
  });

  test("SCN-LOOP-013-4 a ticked task with Verify and no evidence still gets repair", async () => {
    p.write(TASKS, NO_VERIFY.replace("[REQ-AAA-001]\n", "[REQ-AAA-001] Verify: `test -d openspec`\n"));
    const n = await next();
    expect(n).toMatchObject({ action: "repair", task: "001/1.1", state: "done_without_evidence", command: "specctx task done 001/1.1" });
  });
});
