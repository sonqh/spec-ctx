// Covers: REQ-TASK-003, REQ-STAT-002, REQ-LOOP-002
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
    expect(r.out).toBe("bad\nVerify failed (exit 1). The task stays open.\n");
    expect(r.out.trimEnd().split("\n").pop()).toBe("Verify failed (exit 1). The task stays open.");
    expect(r.err).not.toContain("verify failed");
    expect(readFileSync(p.path(TASKS)).equals(before)).toBe(true);
    expect(existsSync(p.path(".ctx/evidence/002/2.2.json"))).toBe(false);
  });

  test("a failure prints the last 20 lines of output", async () => {
    p = new Project();
    p.write(TASKS, "# Tasks\n\n- [ ] 2.1 Long. [REQ-AAA-001] Verify: `seq 1 30 && exit 2`\n");
    const r = await p.run("task", "done", "002/2.1");
    expect(r.code).toBe(1);
    expect(r.out.trimEnd().split("\n")).toEqual([...Array.from({ length: 20 }, (_, i) => String(i + 11)), "Verify failed (exit 2). The task stays open."]);
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

  test("SCN-TASK-003-5 --manual is refused on a task with a Verify command", async () => {
    p = setup();
    const before = readFileSync(p.path(TASKS));
    const r = await p.run("task", "done", "002/2.1", "--manual", "seen");
    expect(r.code).toBe(2);
    expect(r.err).toContain("task 002/2.1 has a Verify command. Run it with specctx task done 002/2.1.");
    expect(existsSync(p.path(".ctx/evidence/002/2.1.json"))).toBe(false);
    expect(readFileSync(p.path(TASKS)).equals(before)).toBe(true);
    // a hand tick on a task with a Verify span gets the same refusal
    p.write(TASKS, p.read(TASKS).replace("- [ ] 2.2", "- [x] 2.2"));
    p.touchForward(TASKS);
    const h = await p.run("task", "done", "002/2.2", "--manual", "pre-dogfood");
    expect(h.code).toBe(2);
    expect(h.err).toContain("task 002/2.2 has a Verify command");
    expect(existsSync(p.path(".ctx/evidence/002/2.2.json"))).toBe(false);
    // --manual stays allowed on a task with no Verify span, once
    expect((await p.run("task", "done", "002/2.3", "--manual", "seen")).code).toBe(0);
    expect((await p.run("task", "done", "002/2.3", "--manual", "again")).code).toBe(2);
  });

  test("a done task with evidence exits 2", async () => {
    p = setup();
    await p.run("task", "done", "002/2.1");
    const r = await p.run("task", "done", "002/2.1");
    expect(r.code).toBe(2);
    expect(r.err).toContain("task 002/2.1 is done");
  });

  test("SCN-TASK-003-6 a hand tick without evidence gets the Verify run, and the box stays", async () => {
    p = setup();
    // a passing Verify writes the evidence and keeps [x]
    p.write(TASKS, BODY.replace("- [ ] 2.1", "- [x] 2.1").replace("- [ ] 2.2", "- [x] 2.2"));
    p.touchForward(TASKS);
    expect((await p.run("check", "--strict")).out).toContain("done-without-evidence  002/2.1");
    const ok = await p.run("task", "done", "002/2.1");
    expect(ok.code, ok.err).toBe(0);
    expect(ok.out).toBe("done 002/2.1. Evidence: .ctx/evidence/002/2.1.json\n");
    expect(JSON.parse(p.read(".ctx/evidence/002/2.1.json"))).toMatchObject({ task: "002/2.1", kind: "command" });
    expect(p.read(TASKS)).toContain("- [x] 2.1 Pass.");
    // a failing Verify leaves the box as it is and writes nothing, so check --strict still reports it
    const before = readFileSync(p.path(TASKS));
    const bad = await p.run("task", "done", "002/2.2");
    expect(bad.code).toBe(1);
    expect(bad.out).toBe("bad\nVerify failed (exit 1). The task stays open.\n");
    expect(readFileSync(p.path(TASKS)).equals(before)).toBe(true);
    expect(existsSync(p.path(".ctx/evidence/002/2.2.json"))).toBe(false);
    const c = await p.run("check", "--strict");
    expect(c.out).toContain("done-without-evidence  002/2.2");
    expect(c.out).not.toContain("done-without-evidence  002/2.1");
    // with evidence the task is done
    const again = await p.run("task", "done", "002/2.1");
    expect(again.code).toBe(2);
    expect(again.err).toContain("task 002/2.1 is done");
  });

  test("SCN-TASK-003-7 a Verify command that changed since task start is refused", async () => {
    p = setup();
    await p.run("task", "start", "002/2.1");
    p.write(TASKS, p.read(TASKS).replace("Verify: `echo ok`", "Verify: `true`"));
    p.touchForward(TASKS);
    const r = await p.run("task", "done", "002/2.1");
    expect(r.code).toBe(2);
    expect(r.err).toContain("task 002/2.1: the Verify command changed since task start. Run specctx task start 002/2.1 again.");
    expect(existsSync(p.path(".ctx/evidence/002/2.1.json"))).toBe(false);
    expect(p.read(TASKS)).toContain("- [ ] 2.1");
    // task start again freezes the new command, and done runs it
    await p.run("task", "start", "002/2.1");
    expect((await p.run("task", "done", "002/2.1")).code).toBe(0);
    // current.json that names another task changes nothing
    await p.run("task", "start", "002/2.3");
    p.write(TASKS, p.read(TASKS).replace("Verify: `echo bad && exit 1`", "Verify: `true`"));
    p.touchForward(TASKS);
    const other = await p.run("task", "done", "002/2.2");
    expect(other.code, other.err).toBe(0);
    expect(existsSync(p.path(".ctx/current.json"))).toBe(true);
  });

  test("SCN-STAT-002-2 done copies bundle_chars and started_at into the evidence", async () => {
    p = setup();
    process.env.SPECCTX_NOW = "2026-10-24T09:00:00.000Z";
    try {
      await p.run("task", "start", "002/2.1");
      const cur = JSON.parse(p.read(".ctx/current.json"));
      process.env.SPECCTX_NOW = "2026-10-24T09:05:00.000Z";
      await p.run("task", "done", "002/2.1");
      const ev = JSON.parse(p.read(".ctx/evidence/002/2.1.json"));
      expect(ev.bundle_chars).toBe(cur.bundle_chars);
      expect(ev.started_at).toBe("2026-10-24T09:00:00.000Z");
      expect(ev.at).toBe("2026-10-24T09:05:00.000Z");
      // a task done without task start has neither field
      await p.run("task", "done", "002/2.3", "--manual", "seen");
      const ev3 = JSON.parse(p.read(".ctx/evidence/002/2.3.json"));
      expect(ev3.bundle_chars).toBeUndefined();
      expect(ev3.started_at).toBeUndefined();
    } finally {
      delete process.env.SPECCTX_NOW;
    }
  });

  test("SCN-TASK-003-8 two failed runs write two fail files, keep the box, and give check nothing", async () => {
    p = setup();
    await p.run("task", "start", "002/2.2");
    expect((await p.run("task", "done", "002/2.2")).code).toBe(1);
    const j = await p.run("task", "done", "002/2.2", "--json");
    expect(j.code).toBe(1);
    expect(JSON.parse(j.out)).toMatchObject({ attempt: 2, fail: ".ctx/evidence/002/2.2.fail-2.json", question: null });
    expect(JSON.parse(p.read(".ctx/evidence/002/2.2.fail-1.json")).attempt).toBe(1);
    expect(JSON.parse(p.read(".ctx/evidence/002/2.2.fail-2.json")).attempt).toBe(2);
    expect(p.read(TASKS)).toContain("- [ ] 2.2 Fail.");
    expect(existsSync(p.path(".ctx/evidence/002/2.2.json"))).toBe(false);
    const c = await p.run("check", "--strict");
    expect(c.out).not.toContain("fail-");
    expect(c.out).not.toContain("evidence-without-done");
  });

  test("SCN-TASK-003-9 the cap writes a question and the blocked line, exit 1", async () => {
    p = setup();
    p.write("spec-ctx.toml", "[loop]\nmax_attempts = 2\n");
    await p.run("task", "start", "002/2.2");
    await p.run("task", "done", "002/2.2");
    const r = await p.run("task", "done", "002/2.2");
    expect(r.code).toBe(1);
    expect(r.out.trimEnd().split("\n").slice(-2)).toEqual([
      "Verify failed (exit 1). The task stays open.",
      'blocked: question 1 written. Run specctx handoff resolve 1 "<answer>" to continue.',
    ]);
    const qs = JSON.parse(p.read(".ctx/questions.json"));
    expect(qs[0]).toMatchObject({ n: 1, task: "002/2.2", status: "open", text: "task 002/2.2 failed Verify 2 times. Last: bad. What should change?" });
    const j = await p.run("task", "done", "002/2.2", "--json");
    expect(JSON.parse(j.out).question).toBe(1);
  });

  test("done clears current.json when it names the task", async () => {
    p = setup();
    await p.run("task", "start", "002/2.1");
    expect(existsSync(p.path(".ctx/current.json"))).toBe(true);
    await p.run("task", "done", "002/2.1");
    expect(existsSync(p.path(".ctx/current.json"))).toBe(false);
  });
});
