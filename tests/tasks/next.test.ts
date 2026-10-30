// Covers: REQ-TASK-001, REQ-TASK-007
import { afterEach, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const tasks = (body: string): string => `# Tasks\n\n${body}`;

describe("task next", () => {
  test("SCN-TASK-001-1 the first open task of a group comes first", async () => {
    p = new Project();
    p.write("openspec/changes/001-x/tasks.md", tasks(
      "## 1. One\n\n- [x] 1.1 A. [REQ-AAA-001] Verify: `true`\n\n## 2. Two\n\n- [ ] 2.1 B. [REQ-AAA-002] Verify: `true`\n- [ ] 2.2 C. [REQ-AAA-001] Verify: `false`\n"));
    const r = await p.run("task", "next");
    expect(r.code).toBe(0);
    expect(r.out).toBe("001/2.1  B.\nreqs: REQ-AAA-002\nverify: true\n");
  });

  test("SCN-TASK-001-2 done tasks are skipped", async () => {
    p = new Project();
    p.write("openspec/changes/001-x/tasks.md", tasks(
      "## 1. One\n\n- [x] 1.1 A. [REQ-AAA-001] Verify: `true`\n- [x] 1.2 B. [REQ-AAA-001] Verify: `true`\n- [ ] 1.3 C. [REQ-AAA-001, REQ-AAA-002] Verify: `a` and `b`\n"));
    const r = await p.run("task", "next", "--json");
    expect(JSON.parse(r.out)).toEqual({
      bundle_command: "specctx context 001/1.3 --budget 8000",
      change: "001-x",
      id: "001/1.3",
      reqs: ["REQ-AAA-001", "REQ-AAA-002"],
      text: "C.",
      verify: "a && b",
    });
  });

  test("the lowest numbered active change wins and --change narrows the search", async () => {
    p = new Project();
    p.write("openspec/changes/000-first/tasks.md", tasks("- [ ] 1.1 Early. [REQ-AAA-001] Verify: `true`\n"));
    expect((await p.run("task", "next")).out.split("\n")[0]).toBe("000/1.1  Early.");
    expect((await p.run("task", "next", "--change", "001-x")).out.split("\n")[0]).toBe("001/1.2  Do beta.");
    expect((await p.run("task", "next", "--change", "001")).out.split("\n")[0]).toBe("001/1.2  Do beta.");
  });

  test("SCN-TASK-001-3 nothing open prints no open task and exits 1", async () => {
    p = new Project();
    p.write("openspec/changes/001-x/tasks.md", tasks("- [x] 1.1 A. [REQ-AAA-001] Verify: `true`\n"));
    const r = await p.run("task", "next");
    expect(r).toMatchObject({ code: 1, out: "no open task. Every task in the active changes is done. Next: archive 001-x.\n" });
  });

  // Covers: REQ-TASK-001
  test("SCN-TASK-001-3 the message names the change 009-x", async () => {
    p = new Project();
    p.write("openspec/changes/001-x/tasks.md", tasks("- [x] 1.1 A. [REQ-AAA-001] Verify: `true`\n"));
    p.write("openspec/changes/009-x/tasks.md", tasks("- [x] 1.1 A. [REQ-AAA-001] Verify: `true`\n"));
    const r = await p.run("task", "next", "--change", "009");
    expect(r).toMatchObject({ code: 1, out: "no open task. Every task in the active changes is done. Next: archive 009-x.\n" });
  });

  test("SCN-TASK-007-1 bundle_command names context behind the run prefix", async () => {
    p = new Project();
    p.write("openspec/changes/002-t/tasks.md", tasks("- [ ] 2.1 A. [REQ-AAA-001] Verify: `true`\n"));
    p.write("spec-ctx.toml", '[cli]\nrun = "node dist/cli.js"\n');
    const r = await p.run("task", "next", "--change", "002", "--json");
    expect(JSON.parse(r.out).bundle_command).toBe("node dist/cli.js context 002/2.1 --budget 8000");
  });
});
