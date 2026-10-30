// Covers: REQ-IDX-004, REQ-IDX-014
import { closeSync, openSync, readFileSync, statSync, unlinkSync, utimesSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

const TASKS = "openspec/changes/001-x/tasks.md";
const OPEN = "# Tasks\n\n## 1. Alpha\n\n- [ ] 1.1 A. Verify: `test -d openspec`\n";
const DONE = "# Tasks\n\n## 1. Alpha\n\n- [x] 1.1 A. [REQ-AAA-001] Verify: `test -d openspec`\n";
let p: Project;
beforeEach(() => {
  delete process.env.SPECCTX_RERUN;
  p = new Project();
});
afterEach(() => p.cleanup());

const indexMs = (q: Project): number => Number(statSync(q.path(".ctx/index.json"), { bigint: true }).mtimeNs / 1000000n);

describe("the index after a write in the clock tick of the build", () => {
  test("SCN-IDX-004-4 a rewrite with the mtime of the first write, at the clock of the build, is read", async () => {
    // The two writes share one mtime, as in one clock tick. The mtime is ahead of the build clock, as for a write
    // in the tick of the build. The old rule read the count and the newest mtime only, so it kept the old index.
    const ahead = Date.now() / 1000 + 60;
    p.write(TASKS, DONE);
    utimesSync(p.path(TASKS), ahead, ahead);
    await p.run("check", "--strict");
    p.write(TASKS, OPEN);
    utimesSync(p.path(TASKS), ahead, ahead);
    const s = await p.run("task", "start", "001/1.1");
    expect(s.out).not.toBe("");
  });

  test("SCN-IDX-004-4 two writes with a build between them, 30 times, are read", async () => {
    let stale = 0;
    for (let i = 0; i < 30; i++) {
      const q = new Project();
      try {
        q.write(TASKS, DONE);
        await q.run("check", "--strict");
        q.write(TASKS, OPEN);
        const s = await q.run("task", "start", "001/1.1");
        if (s.out === "") stale++;
      } finally {
        q.cleanup();
      }
    }
    expect(stale).toBe(0);
  }, 60000);

  test("SCN-IDX-004-2 a build, then a query at once, is silent", async () => {
    let noisy = 0;
    for (let i = 0; i < 30; i++) {
      const q = new Project();
      try {
        q.write(TASKS, OPEN);
        expect((await q.run("build")).code).toBe(0);
        if ((await q.run("query", "x")).err.includes("index rebuilt")) noisy++;
      } finally {
        q.cleanup();
      }
    }
    expect(noisy).toBe(0);
  }, 60000);
});

// the file system clock, read by a temp file, so that the tests do not depend on the engine under test
const clockMs = (q: Project): number => {
  const f = q.path("clock-probe");
  closeSync(openSync(f, "w"));
  const ms = Number(statSync(f, { bigint: true }).mtimeNs / 1000000n);
  unlinkSync(f);
  return ms;
};

describe("the index mtime", () => {
  test("SCN-IDX-014-1 two builds give the same bytes, with no new field, and the mtime is not after a later write", async () => {
    p.write(TASKS, OPEN);
    await p.build();
    const first = p.read(".ctx/index.json");
    const at = indexMs(p);
    await p.build();
    expect(Math.abs(indexMs(p) - at)).toBeLessThan(5000);
    p.write(TASKS, DONE);
    expect(indexMs(p)).toBeLessThanOrEqual(Number(statSync(p.path(TASKS), { bigint: true }).mtimeNs / 1000000n));
    expect(p.read(".ctx/index.json")).toBe(first);
    expect(Object.keys(JSON.parse(first)).sort()).toEqual(["entries", "problems", "scanned", "scn_named"]);
  });

  test("SCN-IDX-014-2 a newest file at the index mtime rebuilds once", async () => {
    p.write(TASKS, OPEN);
    const data = await p.build();
    const ms = data.scanned.newest_mtime_ms;
    utimesSync(p.path(".ctx/index.json"), (ms + 0.5) / 1000, (ms + 0.5) / 1000);
    expect((await p.run("query", "x")).err).toContain("index rebuilt");
    expect((await p.run("query", "x")).err).not.toContain("index rebuilt");
  });

  test("SCN-IDX-014-3 an old mtime with the same count is not seen, and a new file is", async () => {
    p.write(TASKS, OPEN);
    await p.build();
    p.write(TASKS, DONE);
    utimesSync(p.path(TASKS), 1000, 1000);
    expect(readFileSync(p.path(TASKS), "utf8")).toBe(DONE);
    // the file was already counted. Its old mtime is not newer than the recorded newest, so the load keeps the index.
    expect((await p.run("query", "x")).err).not.toContain("index rebuilt");
    p.write("openspec/changes/002-y/tasks.md", OPEN);
    expect((await p.run("query", "x")).err).toContain("index rebuilt");
  });

  test("SCN-IDX-014-4 the index mtime is a reading of the file clock between two readings, and the setter keeps the value", async () => {
    p.write(TASKS, OPEN);
    const before = clockMs(p);
    await p.build();
    const after = clockMs(p);
    expect(indexMs(p)).toBeGreaterThanOrEqual(before);
    expect(indexMs(p)).toBeLessThanOrEqual(after);
    const { mtimeMsOf, setMtimeMs } = await import("../../src/index/clock.ts");
    setMtimeMs(p.path(TASKS), 1700000000123);
    expect(mtimeMsOf(p.path(TASKS))).toBe(1700000000123);
  });

  test("SCN-IDX-014-5 a file 10 ms after the clock, then build, then query, is silent", async () => {
    p.write(TASKS, OPEN);
    const t = (clockMs(p) + 10) / 1000;
    utimesSync(p.path(TASKS), t, t);
    expect((await p.run("build")).code).toBe(0);
    expect((await p.run("query", "x")).err).not.toContain("index rebuilt");
  });
});
