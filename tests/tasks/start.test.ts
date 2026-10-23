// Covers: REQ-TASK-002
import { afterEach, describe, expect, test } from "vitest";
import { existsSync } from "node:fs";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

function setup(): Project {
  const pr = new Project();
  pr.write("openspec/changes/002-t/specs/task/spec.md",
    "## ADDED Requirements\n\n### Requirement: REQ-TASK-001 Next task\nThe tool SHALL pick a task.\n\n#### Scenario: SCN-TASK-001-1 Pick\n- a\n");
  pr.write("openspec/changes/002-t/tasks.md",
    "# Tasks\n\n## 2. Work\n\n- [ ] 2.1 Pick. [REQ-TASK-001] Verify: `true`\n- [x] 2.2 Done one. [REQ-TASK-001] Verify: `true`\n");
  return pr;
}

describe("task start", () => {
  test("SCN-TASK-002-1 start prints the bundle and writes current.json", async () => {
    process.env.SPECCTX_NOW = "2026-10-24T09:00:00.000Z";
    try {
      p = setup();
      const r = await p.run("task", "start", "002/2.1");
      expect(r.code, r.err).toBe(0);
      expect(r.out.startsWith("-- REQ-TASK-001 |")).toBe(true);
      expect(r.out).toContain("#### Scenario: SCN-TASK-001-1 Pick");
      expect(JSON.parse(p.read(".ctx/current.json"))).toEqual({ started_at: "2026-10-24T09:00:00.000Z", task: "002/2.1" });
      expect(p.read(".ctx/current.json")).toBe('{\n  "started_at": "2026-10-24T09:00:00.000Z",\n  "task": "002/2.1"\n}\n');
    } finally {
      delete process.env.SPECCTX_NOW;
    }
  });

  test("the bundle uses the configured budget", async () => {
    p = setup();
    p.write("spec-ctx.toml", "[bundle]\nbudget = 60\n");
    const r = await p.run("task", "start", "002/2.1");
    expect(r.out.startsWith("truncated: ")).toBe(true);
  });

  test("SCN-TASK-002-2 a done task exits 2", async () => {
    p = setup();
    const r = await p.run("task", "start", "002/2.2");
    expect(r.code).toBe(2);
    expect(r.err).toContain("task 002/2.2 is done");
    expect(existsSync(p.path(".ctx/current.json"))).toBe(false);
  });

  test("an unknown task exits 2", async () => {
    p = setup();
    const r = await p.run("task", "start", "002/9.9");
    expect(r.code).toBe(2);
    expect(r.err).toContain("no task 002/9.9");
  });
});
