// Covers: REQ-TASK-008, REQ-TASK-004
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { redactPaths } from "../../src/util/redact.ts";
import { Project } from "../helpers.ts";

// Machine paths out of evidence, fail files, and the cap question (056/D5).

let p: Project;
let home: string;
const savedHome = process.env.HOME;
beforeEach(() => {
  delete process.env.SPECCTX_RERUN;
  home = mkdtempSync(join(tmpdir(), "specctx-home-"));
  process.env.HOME = home;
});
afterEach(() => {
  if (savedHome === undefined) delete process.env.HOME;
  else process.env.HOME = savedHome;
  rmSync(home, { recursive: true, force: true });
  p?.cleanup();
});

const TASKS = "openspec/changes/002-t/tasks.md";

describe("redaction in task done", () => {
  test("SCN-TASK-008-1 the stderr tail of evidence holds . and ~, the command and the printed output stay", async () => {
    p = new Project();
    p.write("emit.sh", `echo "${p.root}/a.ts" >&2\necho "${home}/x" >&2\necho "${p.root}/out.txt"\n`);
    p.write(TASKS, "# Tasks\n\n## 2. Work\n\n- [ ] 2.1 Emit. [REQ-AAA-001] Verify: `sh emit.sh`\n");
    const r = await p.run("task", "done", "002/2.1", "--json");
    expect(r.code, r.err).toBe(0);
    const ev = JSON.parse(p.read(".ctx/evidence/002/2.1.json"));
    expect(ev.verify.stderr_tail).toBe("./a.ts\n~/x");
    expect(ev.verify.command).toBe("sh emit.sh");
    // stdout keeps its digest of the raw bytes
    const raw = await p.run("task", "verify", "002/2.1");
    expect(raw.out).toContain(`${p.root}/a.ts`);
    expect(raw.out).toContain(`${home}/x`);
  });

  test("SCN-TASK-008-2 each fail file and the cap question hold ./ in place of the root", async () => {
    p = new Project();
    p.write("fail.sh", `echo "FAIL ${p.root}/a.test.ts" >&2\nexit 1\n`);
    p.write(TASKS, "# Tasks\n\n## 2. Work\n\n- [ ] 2.2 Fail. [REQ-AAA-001] Verify: `sh fail.sh`\n");
    await p.run("task", "start", "002/2.2");
    for (let i = 0; i < 3; i++) {
      const r = await p.run("task", "done", "002/2.2");
      expect(r.code).toBe(1);
      // the printed tail keeps the full path
      expect(r.out).toContain(`FAIL ${p.root}/a.test.ts`);
    }
    for (const n of [1, 2, 3]) expect(JSON.parse(p.read(`.ctx/evidence/002/2.2.fail-${n}.json`)).stderr_tail).toBe("FAIL ./a.test.ts");
    const qs = JSON.parse(p.read(".ctx/questions.json"));
    expect(qs[0].text).toBe("task 002/2.2 failed Verify 3 times. Last: FAIL ./a.test.ts. What should change?");
  });
});

describe("redactPaths", () => {
  test("a root inside the home gives . and the rest of the home gives ~", () => {
    expect(redactPaths("/home/u/p/a /home/u/b", "/home/u/p", "/home/u", null)).toBe("./a ~/b");
  });

  test("a sibling that starts with the root stays", () => {
    expect(redactPaths("/r/p2/a /r/p/a /r/p", "/r/p", "/h", null)).toBe("/r/p2/a ./a .");
    expect(redactPaths("x/r/p/a", "/r/p", "/h", null)).toBe("x/r/p/a");
  });

  test("a root or home of / or the empty string is skipped", () => {
    expect(redactPaths("/a/b", "/", "", null)).toBe("/a/b");
    expect(redactPaths("/a/b", "", "/", null)).toBe("/a/b");
  });

  test("a home that ends in / still matches", () => {
    expect(redactPaths("/h/u/x and /h/u", "/r", "/h/u/", null)).toBe("~/x and ~");
    expect(redactPaths("/r/a", "/r/", "/h", null)).toBe("./a");
  });

  test("the macOS real path of the root goes first and never leaves /private./", () => {
    expect(redactPaths("/private/tmp/x/a", "/tmp/x", "/Users/u", "/private/tmp/x")).toBe("./a");
    expect(redactPaths("/tmp/x/a /private/tmp/x/b", "/tmp/x", "/Users/u", "/private/tmp/x")).toBe("./a ./b");
    expect(redactPaths("/private/tmp/x/a", "/tmp/x", "/Users/u", "/private/tmp/x")).not.toContain("/private.");
  });

  test("the root wins a tie of length with the home, and the output is deterministic", () => {
    expect(redactPaths("/same/a", "/same", "/same", null)).toBe("./a");
    const t = "/r/p/a\n/h/b";
    expect(redactPaths(t, "/r/p", "/h", null)).toBe(redactPaths(t, "/r/p", "/h", null));
  });

  test("a root whose real path cannot be read still redacts the root", () => {
    expect(redactPaths("/no/such/dir/a", "/no/such/dir", "/h")).toBe("./a");
  });
});
