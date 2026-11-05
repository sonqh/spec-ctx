// Covers: REQ-LOOP-017, REQ-LOOP-002
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync } from "node:fs";
import { ensureFailIgnore, FAIL_IGNORE } from "../../src/loop/fails.ts";
import { cleanEnv, Project } from "../helpers.ts";

// The ignore file that keeps fail files out of git (056/D1).

let p: Project;
beforeEach(() => {
  delete process.env.SPECCTX_RERUN;
});
afterEach(() => {
  p?.cleanup();
});

const TASKS = "openspec/changes/002-t/tasks.md";
const IGNORE = ".ctx/evidence/.gitignore";

function setup(): Project {
  const pr = new Project();
  pr.write(TASKS, "# Tasks\n\n## 2. Work\n\n- [ ] 2.2 Fail. [REQ-AAA-001] Verify: `test -f flag.txt`\n");
  return pr;
}

describe("fail files stay out of git", () => {
  test("SCN-LOOP-017-1 the first failure creates the ignore file and git ignores the fail file", async () => {
    p = setup();
    expect((await p.run("task", "done", "002/2.2")).code).toBe(1);
    expect(p.read(IGNORE)).toBe(`${FAIL_IGNORE}\n`);
    execFileSync("git", ["init", "-q"], { cwd: p.root, env: cleanEnv() });
    const out = execFileSync("git", ["check-ignore", ".ctx/evidence/002/2.2.fail-1.json"], { cwd: p.root, env: cleanEnv(), encoding: "utf8" });
    expect(out.trim()).toBe(".ctx/evidence/002/2.2.fail-1.json");
    // a live evidence file is not ignored: check-ignore exits 1
    let code = 0;
    try {
      execFileSync("git", ["check-ignore", ".ctx/evidence/002/2.2.json"], { cwd: p.root, env: cleanEnv(), stdio: "ignore" });
    } catch (e) {
      code = (e as { status: number }).status;
    }
    expect(code).toBe(1);
  });

  test("SCN-LOOP-017-2 other lines stay, the line is added once, and a second failure leaves the file byte-identical", async () => {
    p = setup();
    p.write(IGNORE, "keep.json");
    await p.run("task", "done", "002/2.2");
    expect(p.read(IGNORE)).toBe(`keep.json\n${FAIL_IGNORE}\n`);
    await p.run("task", "done", "002/2.2");
    expect(p.read(IGNORE)).toBe(`keep.json\n${FAIL_IGNORE}\n`);
    // a file that has the line already keeps its bytes
    p.write(IGNORE, `# mine\n${FAIL_IGNORE}\nother\n`);
    await p.run("task", "done", "002/2.2");
    expect(p.read(IGNORE)).toBe(`# mine\n${FAIL_IGNORE}\nother\n`);
  });

  test("a write error changes nothing", async () => {
    p = setup();
    mkdirSync(p.path(".ctx/evidence"), { recursive: true });
    p.write(IGNORE, "keep.json\n");
    chmodSync(p.path(IGNORE), 0o444);
    try {
      expect(() => ensureFailIgnore(p.root)).not.toThrow();
      // root ignores the mode bits, so only a non-root run sees the file unchanged
      if (process.getuid?.() !== 0) expect(p.read(IGNORE)).toBe("keep.json\n");
    } finally {
      chmodSync(p.path(IGNORE), 0o644);
    }
    // a directory in place of the file: the read throws, and ensureFailIgnore swallows it
    p.cleanup();
    p = setup();
    mkdirSync(p.path(IGNORE), { recursive: true });
    expect(() => ensureFailIgnore(p.root)).not.toThrow();
    const r = await p.run("task", "done", "002/2.2", "--json");
    expect(r.code).toBe(1);
    expect(JSON.parse(r.out)).toMatchObject({ attempt: 1, fail: ".ctx/evidence/002/2.2.fail-1.json" });
  });
});
