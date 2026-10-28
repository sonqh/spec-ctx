// Covers: REQ-IDX-005, REQ-TASK-001, REQ-TASK-002
import { existsSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import { KEBAB_FIXTURE, Project } from "../helpers.ts";

let p: Project | undefined;
afterEach(() => {
  p?.cleanup();
  p = undefined;
});

describe("tasks in kebab-case changes", () => {
  test("SCN-IDX-005-4 task done add-sso/1.1 closes the second change", async () => {
    p = new Project(KEBAB_FIXTURE);
    expect((await p.run("task", "done", "add-mfa/1.1")).code).toBe(0);
    const r = await p.run("task", "done", "add-sso/1.1");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("done add-sso/1.1");
    expect(p.read("openspec/changes/add-sso/tasks.md")).toContain("- [x] 1.1");
    expect(p.read("openspec/changes/add-mfa/tasks.md")).toContain("- [x] 1.1");
    expect(existsSync(p.path(".ctx/evidence/add-mfa/1.1.json"))).toBe(true);
    expect(existsSync(p.path(".ctx/evidence/add-sso/1.1.json"))).toBe(true);
    const s = await p.run("status");
    expect(s.out).toContain("add-mfa  done 1  open 1");
    expect(s.out).toContain("add-sso  done 1  open 1");
  });

  test("SCN-IDX-005-3 task start, verify, reopen, and next take the change key or folder", async () => {
    p = new Project(KEBAB_FIXTURE);
    expect((await p.run("task", "next", "--change", "add-sso")).out).toMatch(/^add-sso\/1\.1 /);
    expect((await p.run("task", "start", "add-sso/1.1")).code).toBe(0);
    expect((await p.run("task", "verify", "add-sso/1.1")).code).toBe(0);
    expect((await p.run("task", "done", "add-sso/1.1")).code).toBe(0);
    const re = await p.run("task", "reopen", "add-sso/1.1", "redo");
    expect(re.code, re.err).toBe(0);
    expect(p.read("openspec/changes/add-sso/tasks.md")).toContain("- [ ] 1.1");
  });

  test("SCN-IDX-005-3 a numbered change accepts its full folder name", async () => {
    p = new Project();
    p.write("openspec/changes/003-distribution/tasks.md", "# Tasks\n\n## 3. Ship\n\n- [ ] 3.3 Publish. [REQ-AAA-001] Verify: `true`\n");
    const r = await p.run("task", "start", "003-distribution/3.3");
    expect(r.code, r.err).toBe(0);
    expect(p.read(".ctx/current.json")).toContain('"task": "003/3.3"');
    expect((await p.run("task", "next", "--change", "003-distribution")).out).toMatch(/^003\/3\.3 /);
    const d = await p.run("task", "done", "003-distribution/3.3");
    expect(d.out).toContain("done 003/3.3");
    expect(existsSync(p.path(".ctx/evidence/003/3.3.json"))).toBe(true);
  });

  test("SCN-IDX-005-2 stats and id new take a kebab-case change", async () => {
    p = new Project(KEBAB_FIXTURE);
    await p.run("task", "done", "add-mfa/1.1");
    const s = await p.run("stats", "--change", "add-mfa");
    expect(s.code).toBe(0);
    expect(s.out).toMatch(/^add-mfa /m);
    expect(s.out).not.toMatch(/^add-sso /m);
    const dec = await p.run("id", "new", "DEC", "add-mfa");
    expect(dec.out).toBe("add-mfa/D2\n");
  });
});
