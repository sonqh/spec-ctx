// Covers: REQ-VER-004
import { afterEach, describe, expect, test } from "vitest";
import { existsSync } from "node:fs";
import { parseVerify } from "../../src/verify/parse.ts";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const TASKS = "openspec/changes/006-t/tasks.md";

describe("Verify cwd prefix", () => {
  test("SCN-VER-004-1 the command runs in the folder and the evidence keeps cwd", async () => {
    p = new Project();
    p.write("tests/fixtures/no-id-repo/marker.txt", "here\n");
    p.write(TASKS, "# Tasks\n\n- [ ] 1.1 Run inside. [REQ-AAA-001] Verify: `cwd=tests/fixtures/no-id-repo test -f marker.txt && pwd`\n");
    const r = await p.run("task", "done", "006/1.1");
    expect(r.code, r.err).toBe(0);
    const ev = JSON.parse(p.read(".ctx/evidence/006/1.1.json"));
    expect(ev.cwd).toBe("tests/fixtures/no-id-repo");
    expect(ev.verify.command).toBe("test -f marker.txt && pwd");
    const dry = await p.run("task", "verify", "006/1.1");
    expect(dry.out).toContain(p.path("tests/fixtures/no-id-repo"));
  });

  test("SCN-VER-004-2 a cwd outside the root exits 2 and names the path", async () => {
    p = new Project();
    p.write(TASKS, "# Tasks\n\n- [ ] 1.1 Escape. [REQ-AAA-001] Verify: `cwd=../other true`\n");
    const r = await p.run("task", "done", "006/1.1");
    expect(r.code).toBe(2);
    expect(r.err).toContain("../other");
    expect(existsSync(p.path(".ctx/evidence/006/1.1.json"))).toBe(false);
  });

  test("parsing keeps the cwd out of the command", () => {
    expect(parseVerify("- [ ] 1.1 X. Verify: `cwd=a/b npx x --all` and `true`")).toEqual({ kind: "command", command: "npx x --all && true", cwd: "a/b" });
    expect(parseVerify("- [ ] 1.1 X. Verify: `npx x`").cwd).toBeUndefined();
  });
});
