// Covers: REQ-TASK-004
import { afterEach, describe, expect, test } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Project, TAG } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const TASKS = "openspec/changes/002-t/tasks.md";
const sha = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

function setup(): Project {
  const pr = new Project();
  pr.write("openspec/changes/002-t/specs/task/spec.md",
    "## ADDED Requirements\n\n### Requirement: REQ-TASK-001 Next\nText.\n\n#### Scenario: SCN-TASK-001-1 S\n- a\n");
  pr.write("src/a.ts", TAG + "TASK-001\nexport const a = 1;\n");
  pr.write("src/other.ts", TAG + "AAA-002\n");
  pr.write(TASKS, "# Tasks\n\n- [ ] 2.1 Do. [REQ-TASK-001] Verify: `echo same && echo warn >&2`\n");
  return pr;
}

describe("evidence shape", () => {
  test("SCN-TASK-004-1 files maps each tagged file to its sha256", async () => {
    p = setup();
    expect((await p.run("task", "done", "002/2.1")).code).toBe(0);
    const ev = JSON.parse(p.read(".ctx/evidence/002/2.1.json"));
    expect(ev.files).toEqual({ "src/a.ts": sha(p.path("src/a.ts")) });
  });

  test("keys are sorted and the fields have their types", async () => {
    process.env.SPECCTX_NOW = "2026-10-24T10:00:00.000Z";
    try {
      p = setup();
      await p.run("task", "done", "002/2.1");
      const raw = p.read(".ctx/evidence/002/2.1.json");
      const ev = JSON.parse(raw);
      expect(Object.keys(ev)).toEqual(["at", "files", "kind", "reqs", "task", "tool_version", "verify"]);
      expect(Object.keys(ev.verify)).toEqual(["command", "exit", "stderr_tail", "stdout_sha256"]);
      expect(ev.at).toBe("2026-10-24T10:00:00.000Z");
      expect(ev.verify.stdout_sha256).toBe(createHash("sha256").update("same\n").digest("hex"));
      expect(ev.verify.stderr_tail).toBe("warn");
      expect(raw.endsWith("}\n")).toBe(true);
    } finally {
      delete process.env.SPECCTX_NOW;
    }
  });

  test("two runs with the same inputs differ only in at", async () => {
    p = setup();
    await p.run("task", "done", "002/2.1");
    const a = JSON.parse(p.read(".ctx/evidence/002/2.1.json"));
    await p.run("task", "reopen", "002/2.1", "again");
    await new Promise((r) => setTimeout(r, 5));
    await p.run("task", "done", "002/2.1");
    const b = JSON.parse(p.read(".ctx/evidence/002/2.1.json"));
    expect({ ...a, at: 0 }).toEqual({ ...b, at: 0 });
    expect(a.at).not.toBe(b.at);
  });

  test("stderr_tail keeps at most 20 lines", async () => {
    p = setup();
    p.write(TASKS, "# Tasks\n\n- [ ] 2.1 Do. [REQ-TASK-001] Verify: `seq 1 25 >&2`\n");
    await p.run("task", "done", "002/2.1");
    const tail = JSON.parse(p.read(".ctx/evidence/002/2.1.json")).verify.stderr_tail.split("\n");
    expect(tail).toHaveLength(20);
    expect(tail[19]).toBe("25");
  });
});
