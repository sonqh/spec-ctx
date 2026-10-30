// Covers: REQ-TASK-002, REQ-STAT-002
import { afterEach, describe, expect, test } from "vitest";
import { existsSync } from "node:fs";
import { NO_ID_FIXTURE, Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

function setup(): Project {
  const pr = new Project();
  pr.write("openspec/changes/002-t/specs/task/spec.md",
    "## ADDED Requirements\n\n### Requirement: REQ-TASK-001 Next task\nThe tool SHALL pick a task.\n\n#### Scenario: SCN-TASK-001-1 Pick\n- a\n");
  pr.write("openspec/changes/002-t/tasks.md",
    "# Tasks\n\n## 2. Work\n\n- [ ] 2.1 Pick. [REQ-TASK-001] Verify: `true`\n- [x] 2.2 Done one. [REQ-TASK-001] Verify: `true`\n");
  return pr;
}

const FOOTER = /^-- bundle \d+ chars, \d+(\.\d)?% of \d+ chars of spec text$/;

/** The output without its footer line. */
function bundleOf(out: string): string {
  const lines = out.split("\n");
  expect(lines.at(-1)).toBe("");
  expect(lines.at(-2)).toMatch(FOOTER);
  return lines.slice(0, -2).join("\n") + (lines.length > 2 ? "\n" : "");
}

describe("task start", () => {
  test("SCN-TASK-002-1 start prints the bundle and writes current.json", async () => {
    process.env.SPECCTX_NOW = "2026-10-24T09:00:00.000Z";
    try {
      p = setup();
      const r = await p.run("task", "start", "002/2.1");
      expect(r.code, r.err).toBe(0);
      const ctx = await p.run("context", "002/2.1");
      expect(ctx.code, ctx.err).toBe(0);
      expect(r.out.startsWith(ctx.out)).toBe(true);
      expect(r.out).toContain("-- REQ-TASK-001 |");
      expect(r.out).toContain("#### Scenario: SCN-TASK-001-1 Pick");
      const n = [...bundleOf(r.out)].length;
      expect(JSON.parse(p.read(".ctx/current.json"))).toEqual({ bundle_chars: n, started_at: "2026-10-24T09:00:00.000Z", task: "002/2.1", verify: "true" });
      expect(p.read(".ctx/current.json")).toBe(`{\n  "bundle_chars": ${n},\n  "started_at": "2026-10-24T09:00:00.000Z",\n  "task": "002/2.1",\n  "verify": "true"\n}\n`);
    } finally {
      delete process.env.SPECCTX_NOW;
    }
  });

  test("SCN-TASK-002-5 start freezes the Verify command in current.json", async () => {
    p = setup();
    p.append("openspec/changes/002-t/tasks.md", "- [ ] 2.3 Prose. [REQ-TASK-001] Verify: read the log\n");
    await p.run("task", "start", "002/2.1");
    expect(JSON.parse(p.read(".ctx/current.json")).verify).toBe("true");
    await p.run("task", "start", "002/2.3");
    const cur = JSON.parse(p.read(".ctx/current.json"));
    expect(cur.task).toBe("002/2.3");
    expect(cur.verify).toBeNull();
    expect(Object.keys(cur)).toEqual(["bundle_chars", "started_at", "task", "verify"]);
  });

  test("SCN-STAT-002-1 start records the size of the bundle it printed", async () => {
    p = setup();
    const r = await p.run("task", "start", "002/2.1");
    const cur = JSON.parse(p.read(".ctx/current.json"));
    expect(cur.bundle_chars).toBe([...bundleOf(r.out)].length);
    expect(cur.bundle_chars).toBeGreaterThan(50);
  });

  test("the output minus its footer equals context for the same task", async () => {
    p = setup();
    const r = await p.run("task", "start", "002/2.1");
    const ctx = await p.run("context", "002/2.1");
    expect(bundleOf(r.out)).toBe(ctx.out);
  });

  test("SCN-TASK-002-6 a shared task number reads the active task", async () => {
    p = setup();
    p.write("src/a.ts", `// ${"REQ-"}TASK-001 code\n`);
    // the archived task has the same ID and sorts later in the index. It cites no requirement.
    p.write("openspec/changes/archive/2026-01-02-002-t/tasks.md", "# Tasks\n\n## 2. Work\n\n- [x] 2.1 Old pick. Verify: `true`\n");
    const idx = await p.build();
    expect(idx.entries.filter((e: any) => e.kind === "task" && e.id === "002/2.1").length).toBe(2);
    const r = await p.run("task", "start", "002/2.1");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("| ref from 002/2.1\n");
    expect(r.out).toContain("-- src/a.ts:1 |");
    expect(r.out).not.toContain("cites no REQ");
    const ctx = await p.run("context", "002/2.1");
    expect(bundleOf(r.out)).toBe(ctx.out);
  });

  test("the bundle uses the configured budget", async () => {
    p = setup();
    p.write("spec-ctx.toml", "[bundle]\nbudget = 60\n");
    const r = await p.run("task", "start", "002/2.1");
    expect(r.out.startsWith("truncated: ")).toBe(true);
  });

  test("SCN-TASK-002-2 a done task exits 2", async () => {
    p = setup();
    const r = await p.run("task", "start", "002/2.2");
    expect(r.code).toBe(2);
    expect(r.err).toContain("task 002/2.2 is done");
    expect(existsSync(p.path(".ctx/current.json"))).toBe(false);
  });

  test("an unknown task exits 2", async () => {
    p = setup();
    const r = await p.run("task", "start", "002/9.9");
    expect(r.code).toBe(2);
    expect(r.err).toContain("no task 002/9.9");
  });

  test("SCN-TASK-002-4 a task with no REQ gets one hint line before the footer", async () => {
    p = new Project(NO_ID_FIXTURE);
    expect((await p.run("init")).code).toBe(0);
    expect((await p.run("adopt")).code).toBe(0);
    const r = await p.run("task", "start", "add-mfa/1.3");
    expect(r.code, r.err).toBe(0);
    const ctx = await p.run("context", "add-mfa/1.3");
    expect(ctx.code, ctx.err).toBe(0);
    expect(ctx.out).toContain("-- add-mfa/1.3 |");
    const hint = "task add-mfa/1.3 cites no REQ. Run specctx query --change add-mfa --kind req to list its requirements, then add [REQ-<CAP>-NNN] to the task line.";
    expect(r.out.startsWith(ctx.out + hint + "\n")).toBe(true);
    const lines = r.out.trimEnd().split("\n");
    expect(lines.at(-2)).toBe(hint);
    expect(lines.at(-1)).toMatch(/^-- bundle \d+ chars, \d+(\.\d)?% of \d+ chars of spec text$/);
    const j = JSON.parse((await p.run("task", "start", "add-mfa/1.3", "--json")).out);
    expect(j.hint).toBe(hint);
  });

  test("SCN-TASK-002-3 the footer ends task start on the fixture task add-mfa/1.3, and bundle has none", async () => {
    p = new Project(NO_ID_FIXTURE);
    expect((await p.run("init")).code).toBe(0);
    expect((await p.run("adopt")).code).toBe(0);
    const tasks = "openspec/changes/add-mfa/tasks.md";
    const before = p.read(tasks);
    const after = before.replace(/^- \[ \] 1\.3 (.*)$/m, "- [ ] 1.3 $1. [REQ-UA-004] Verify: `true`");
    expect(after).not.toBe(before);
    p.write(tasks, after);
    const r = await p.run("task", "start", "add-mfa/1.3");
    expect(r.code, r.err).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    const last = lines.at(-1)!;
    expect(last).toMatch(FOOTER);
    const [, n, pct, m] = /^-- bundle (\d+) chars, ([\d.]+)% of (\d+) chars/.exec(last)!;
    const cur = JSON.parse(p.read(".ctx/current.json"));
    expect(Number(n)).toBe(cur.bundle_chars);
    expect(Number(m)).toBeGreaterThan(Number(n));
    expect(Math.abs(Number(pct) - (100 * Number(n)) / Number(m))).toBeLessThan(0.06);
    const s = await p.run("stats", "--json");
    if (s.code === 0 && s.out.trim().startsWith("{")) expect(JSON.parse(s.out).spec_chars).toBe(Number(m));
    const b = await p.run("bundle", "REQ-UA-004");
    expect(b.code).toBe(0);
    expect(b.out).toContain("REQ-UA-004");
    expect(b.out.split("\n").some((l) => FOOTER.test(l))).toBe(false);
  });
});
