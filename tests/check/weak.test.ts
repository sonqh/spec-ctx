// Covers: REQ-CHK-005, REQ-ADOPT-005
import { afterEach, describe, expect, test } from "vitest";
import { isWeakVerify } from "../../src/verify/parse.ts";
import { Project, type Run } from "../helpers.ts";

const TASKS = "openspec/changes/001-x/tasks.md";
const HINT = "Name a test file or a command whose exit code proves the task.";
let p: Project;
afterEach(() => p?.cleanup());

async function check(...flags: string[]): Promise<Run> {
  await p.build();
  return p.run("check", ...flags);
}
const task = (n: string, verify: string): string => `- [ ] 1.${n} Do it. [REQ-AAA-001] Verify: ${verify}\n`;
const weakIds = (out: string): string[] => [...out.matchAll(/:(\d+)  weak-verify  (\S+)/g)].map((m) => `${m[2]}@${m[1]}`);

describe("isWeakVerify", () => {
  test("the four forms and whitespace", () => {
    for (const c of ["true", ":", "exit 0", "  exit   0 ", "echo", "echo done", " echo 'all good' "]) expect(isWeakVerify(c), c).toBe(true);
    for (const c of ["bun test tests/a.test.ts", "echo ok && bun test", "echo ok | grep ok", "echo a; false", "truex", "exit 1", "true && bun test"]) expect(isWeakVerify(c), c).toBe(false);
  });
});

describe("weak-verify rule", () => {
  test("SCN-CHK-005-1 each weak form fires in strict mode", async () => {
    p = new Project();
    p.append(TASKS, task("3", "`true`") + task("4", "`:`") + task("5", "`  exit 0 `") + task("6", "`echo done`"));
    const r = await check("--strict");
    expect(r.code, r.out).toBe(1);
    expect(weakIds(r.out)).toEqual(["001/1.3@7", "001/1.4@8", "001/1.5@9", "001/1.6@10"]);
  });

  test("SCN-CHK-005-2 plain check prints an advisory warning and exits 0", async () => {
    p = new Project();
    p.append(TASKS, task("3", "`true`"));
    const r = await check();
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain(`warning: weak-verify 001/1.3 ${TASKS}:7\n`);
    expect(r.out).toContain("1 finding in 1 file (0 hard, 1 advisory)");
    expect(r.out).toContain(`weak-verify  1  ${HINT}`);
  });

  test("SCN-CHK-005-3 a real command does not fire", async () => {
    p = new Project();
    p.append(TASKS, task("3", "`bun test tests/a.test.ts`") + task("4", "`echo ok && bun test`") + task("5", "`echo ok | grep ok`") + task("6", "`truex`") + task("7", "`exit 1`"));
    const r = await check("--strict");
    expect(r.out).not.toContain("weak-verify");
    expect((await check()).out).not.toContain("weak-verify");
  });

  test("SCN-CHK-005-4 the cwd prefix comes off and spans join", async () => {
    p = new Project();
    p.append(TASKS, task("3", "`cwd=pkg true`") + task("4", "`true` `bun test`"));
    const r = await check("--strict");
    expect(weakIds(r.out)).toEqual(["001/1.3@7"]);
  });

  test("SCN-CHK-005-5 the hint, and an archived task does not fire", async () => {
    p = new Project();
    p.write("openspec/changes/archive/2026-01-01-000-old/tasks.md", "# Tasks\n\n## 1. Old\n\n- [x] 1.1 Old. [REQ-AAA-001] Verify: `true`\n");
    p.append(TASKS, task("3", "`true`"));
    const r = await check("--strict");
    expect(weakIds(r.out)).toEqual(["001/1.3@7"]);
    expect(r.out).toContain(`weak-verify  1  ${HINT}`);
  });

  test("SCN-CHK-005-6 the baseline holds legacy debt only", async () => {
    p = new Project();
    p.append(TASKS, task("3", "`true`"));
    await p.build();
    expect((await p.run("baseline", "write")).code).toBe(0);
    expect(JSON.parse(p.read(".ctx/baseline.json"))).toContain("weak-verify 001/1.3");
    expect((await check()).out).not.toContain("weak-verify");
    p.append(TASKS, task("4", "`echo ok`"));
    const r = await check("--strict");
    expect(weakIds(r.out)).toEqual(["001/1.4@8"]);
    expect(r.out).toMatch(/baselined: [1-9]/);
    const plain = await check();
    expect(plain.out).toContain(`warning: weak-verify 001/1.4 ${TASKS}:8`);
    expect(plain.out).not.toContain("weak-verify 001/1.3");
  });
});
