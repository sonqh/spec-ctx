// Covers: REQ-VER-001, REQ-VER-003
import { afterEach, describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { runVerify, tail } from "../../src/verify/run.ts";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const TASKS = "openspec/changes/001-x/tasks.md";

describe("Verify runner", () => {
  test("runs with sh -c in the project root", async () => {
    p = new Project();
    const r = await runVerify("pwd && echo err >&2 && exit 3", p.path("src"), 10);
    expect(r.exit).toBe(3);
    expect(r.stdout.toString().trim()).toBe(p.path("src"));
    expect(r.stderr.toString()).toBe("err\n");
    expect(r.timedOut).toBe(false);
  });

  test("tail keeps the last 20 lines", () => {
    const text = Array.from({ length: 30 }, (_, i) => `l${i + 1}`).join("\n") + "\n";
    const t = tail(text).split("\n");
    expect(t).toHaveLength(20);
    expect(t[0]).toBe("l11");
    expect(t[19]).toBe("l30");
    expect(tail("")).toBe("");
  });

  test("task done runs the command in the project root", async () => {
    p = new Project();
    p.write(TASKS, p.read(TASKS) + "- [ ] 1.3 Write a marker. [REQ-AAA-001] Verify: `test -f spec-ctx.toml`\n");
    p.write("spec-ctx.toml", "# defaults\n");
    const r = await p.runIn(p.path("src"), "task", "done", "001/1.3");
    expect(r.code, r.err).toBe(0);
  });

  test("SCN-VER-003-1 a command past the timeout is killed and done writes nothing", async () => {
    p = new Project();
    p.write("spec-ctx.toml", "[verify]\ntimeout_s = 1\n");
    p.write(TASKS, p.read(TASKS) + "- [ ] 1.3 Sleep. [REQ-AAA-001] Verify: `sleep 5`\n");
    const before = readFileSync(p.path(TASKS));
    const t0 = Date.now();
    const r = await p.run("task", "done", "001/1.3");
    expect(Date.now() - t0).toBeLessThan(4000);
    expect(r.code).toBe(1);
    expect(r.err).toContain("verify timed out after 1s");
    expect(readFileSync(p.path(TASKS)).equals(before)).toBe(true);
    expect(existsSync(p.path(".ctx/evidence/001/1.3.json"))).toBe(false);
  });

  test("the timeout also stops the children of sh", async () => {
    const t0 = Date.now();
    const r = await runVerify("sleep 5 | cat", process.cwd(), 1);
    expect(r.timedOut).toBe(true);
    expect(r.exit).toBeNull();
    expect(Date.now() - t0).toBeLessThan(4000);
  });
});
