// Covers: REQ-TASK-003
import { afterEach, describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const TASKS = "openspec/changes/002-t/tasks.md";
const BODY = "# Tasks\r\n\r\n## 2. Work\r\n\r\n- [ ] 2.1 Pass. [REQ-AAA-001] Verify: `echo ok`\r\n- [ ] 2.2 Fail. [REQ-AAA-001] Verify: `echo bad && exit 1`\r\n- [ ] 2.3 Prose. [REQ-AAA-002] Verify: read the output\r\n  continuation line stays\r\n";

function setup(): Project {
  const pr = new Project();
  pr.write(TASKS, BODY);
  return pr;
}

describe("task done", () => {
  test("SCN-TASK-003-1 a passing Verify ticks only that box and writes evidence", async () => {
    p = setup();
    const r = await p.run("task", "done", "002/2.1");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toBe("done 002/2.1. Evidence: .ctx/evidence/002/2.1.json\n");
    expect(p.read(TASKS)).toBe(BODY.replace("- [ ] 2.1", "- [x] 2.1"));
    const ev = JSON.parse(p.read(".ctx/evidence/002/2.1.json"));
    expect(ev).toMatchObject({ task: "002/2.1", kind: "command", reqs: ["REQ-AAA-001"] });
    expect(ev.verify).toMatchObject({ command: "echo ok", exit: 0 });
    expect((await p.run("status")).out).toContain("002-t  done 1  open 2");
  });

  test("SCN-TASK-003-2 a failing Verify writes nothing and exits 1", async () => {
    p = setup();
    const before = readFileSync(p.path(TASKS));
    const r = await p.run("task", "done", "002/2.2");
    expect(r.code).toBe(1);
    expect(r.out).toBe("bad\n");
    expect(r.err).toContain("verify failed with exit 1");
    expect(readFileSync(p.path(TASKS)).equals(before)).toBe(true);
    expect(existsSync(p.path(".ctx/evidence/002/2.2.json"))).toBe(false);
  });

  test("a failure prints the last 20 lines of output", async () => {
    p = new Project();
    p.write(TASKS, "# Tasks\n\n- [ ] 2.1 Long. [REQ-AAA-001] Verify: `seq 1 30 && exit 2`\n");
    const r = await p.run("task", "done", "002/2.1");
    expect(r.code).toBe(1);
    expect(r.out.trimEnd().split("\n")).toEqual(Array.from({ length: 20 }, (_, i) => String(i + 11)));
  });

  test("SCN-TASK-003-3 manual evidence holds the note", async () => {
    p = setup();
    const r = await p.run("task", "done", "002/2.3", "--manual", "reviewed output by eye");
    expect(r.code, r.err).toBe(0);
    const ev = JSON.parse(p.read(".ctx/evidence/002/2.3.json"));
    expect(ev.kind).toBe("manual");
    expect(ev.note).toBe("reviewed output by eye");
    expect(p.read(TASKS)).toContain("- [x] 2.3 Prose.");
    expect(p.read(TASKS)).toContain("  continuation line stays\r\n");
  });

  test("SCN-TASK-003-4 prose Verify without --manual exits 2", async () => {
    p = setup();
    const r = await p.run("task", "done", "002/2.3");
    expect(r.code).toBe(2);
    expect(r.err).toContain("--manual");
    expect(existsSync(p.path(".ctx/evidence/002/2.3.json"))).toBe(false);
  });

  test("a done task exits 2, and --manual backfills a task ticked by hand", async () => {
    p = setup();
    await p.run("task", "done", "002/2.1");
    expect((await p.run("task", "done", "002/2.1")).code).toBe(2);
    p.write(TASKS, p.read(TASKS).replace("- [ ] 2.2", "- [x] 2.2"));
    p.touchForward(TASKS);
    expect((await p.run("task", "done", "002/2.2")).code).toBe(2);
    const r = await p.run("task", "done", "002/2.2", "--manual", "pre-dogfood");
    expect(r.code, r.err).toBe(0);
    expect(JSON.parse(p.read(".ctx/evidence/002/2.2.json")).kind).toBe("manual");
    expect((await p.run("task", "done", "002/2.2", "--manual", "again")).code).toBe(2);
  });

  test("done clears current.json when it names the task", async () => {
    p = setup();
    await p.run("task", "start", "002/2.1");
    expect(existsSync(p.path(".ctx/current.json"))).toBe(true);
    await p.run("task", "done", "002/2.1");
    expect(existsSync(p.path(".ctx/current.json"))).toBe(false);
  });
});
