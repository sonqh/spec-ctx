// Covers: REQ-CLI-010, REQ-LOOP-001, REQ-CLI-007
import { rmSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { hintOf } from "../../src/check/hints.ts";
import { blockedLine } from "../../src/loop/fails.ts";
import { NO_ID_FIXTURE, OPENSPEC_STUB, Project } from "../helpers.ts";

const RUN = "node dist/cli.js";
let p: Project;
beforeEach(() => {
  process.env.SPECCTX_OPENSPEC = OPENSPEC_STUB;
  delete process.env.SPECCTX_RERUN;
  p = new Project();
  rmSync(p.path(".ctx/evidence/001/1.1.json"), { force: true });
  p.write("spec-ctx.toml", `[cli]\nrun = "${RUN}"\n`);
  p.write("openspec/changes/001-x/tasks.md", [
    "# Tasks", "", "## 1. Alpha", "",
    "- [ ] 1.1 A. [REQ-AAA-001] Verify: `test -d openspec`", "",
  ].join("\n"));
});
afterEach(() => {
  delete process.env.SPECCTX_OPENSPEC;
  p?.cleanup();
});

async function next(): Promise<Record<string, any>> {
  const r = await p.run("next", "--json");
  expect(r.code, r.err).toBe(0);
  return JSON.parse(r.out);
}
async function approvePlan(): Promise<void> {
  expect((await p.run("handoff", "ask", "--change", "001", "--plan", "plan ready for 001-x. Approve to start the tasks?")).code).toBe(0);
  expect((await p.run("handoff", "resolve", "1", "yes")).code).toBe(0);
}

describe("the run prefix on next and status", () => {
  test("SCN-CLI-010-1 plan stop, start, work, gate, archive and the status line carry the prefix", async () => {
    const plan = await next();
    expect(plan.state).toBe("plan_stop");
    expect(plan.command).toBe(`${RUN} handoff ask --change 001-x --plan "plan ready for 001-x. Approve to start the tasks?"`);
    await approvePlan();
    expect((await next()).command).toBe(`${RUN} task start 001/1.1`);
    const s = await p.run("status");
    expect(s.out.trimEnd().split("\n").at(-1)).toBe(`next: ${RUN} task start 001/1.1`);
    const h = await p.run("next");
    expect(h.out.trimEnd().split("\n").at(-1)).toBe(`next: ${RUN} task start 001/1.1`);
    expect((await p.run("task", "start", "001/1.1")).code).toBe(0);
    expect((await next()).command).toBe(`${RUN} task done 001/1.1`);
    expect((await p.run("task", "done", "001/1.1")).code).toBe(0);
    expect((await next()).command).toBe(`${RUN} gate --strict`);
    p.write(".ctx/gate-log.jsonl", JSON.stringify({ at: "9999-12-31T00:00:00.000Z", ok: true, strict: true }) + "\n");
    const a = await next();
    expect(a.action).toBe("archive");
    expect(a.command).toBe(`${RUN} handoff ask --change 001-x "archive 001-x?"`);
  });

  test("SCN-CLI-010-1 cite, a failed task and an open question carry the prefix", async () => {
    await approvePlan();
    p.write("openspec/changes/001-x/tasks.md", "# Tasks\n\n## 1. Alpha\n\n- [ ] 1.1 A. Verify: `test -d openspec`\n");
    const c = await next();
    expect(c.action).toBe("cite");
    expect(c.command).toBe(`${RUN} query --change 001-x --kind req`);
    p.write("openspec/changes/001-x/tasks.md", "# Tasks\n\n## 1. Alpha\n\n- [ ] 1.1 A. [REQ-AAA-001] Verify: `false`\n");
    expect((await p.run("task", "start", "001/1.1")).code).toBe(0);
    const f = await p.run("task", "done", "001/1.1");
    expect(f.code).toBe(1);
    expect(await next()).toMatchObject({ action: "fix", command: `${RUN} task done 001/1.1` });
    expect((await p.run("handoff", "ask", "--change", "001", "what now?")).code).toBe(0);
    const q = await next();
    expect(q.action).toBe("ask");
    expect(q.command).toMatch(new RegExp(`^${RUN} handoff resolve \\d+ "<answer>"$`));
  });

  test("SCN-CLI-010-1 each part of a joined repair command carries the prefix", async () => {
    await approvePlan();
    p.write("openspec/changes/001-x/tasks.md", "# Tasks\n\n## 1. Alpha\n\n- [ ] 1.1 A. [REQ-AAA-001] Verify: `test -d openspec`\n");
    expect((await p.run("task", "done", "001/1.1")).code).toBe(0);
    p.append("src/a.ts", "export const later = 2;\n");
    const r = await next();
    expect(r.action).toBe("repair");
    expect(r.command).toBe(`${RUN} task reopen 001/1.1 "stale evidence: src/a.ts" && ${RUN} task done 001/1.1`);
  });
});

describe("the run prefix on hints and errors", () => {
  test("SCN-CLI-010-2 hintOf and blockedLine fill the prefix, and the default stays specctx", () => {
    expect(hintOf("stale-evidence", RUN)).toBe(`Run ${RUN} task reopen <task> <why>, then ${RUN} task done <task>.`);
    expect(hintOf("stale-evidence")).toBe("Run specctx task reopen <task> <why>, then specctx task done <task>.");
    expect(hintOf("nonsense", RUN)).not.toContain("{run}");
    expect(blockedLine(3, RUN)).toBe(`blocked: question 3 written. Run ${RUN} handoff resolve 3 "<answer>" to continue.`);
    expect(blockedLine(3)).toContain("Run specctx handoff resolve 3");
  });

  test("SCN-CLI-010-2 check hint, cite hint of task start, and the usage errors carry the prefix", async () => {
    p.write("openspec/changes/001-x/tasks.md", "# Tasks\n\n## 1. Alpha\n\n- [x] 1.1 A. [REQ-AAA-001] Verify: `test -d openspec`\n");
    const c = await p.run("check", "--strict");
    expect(c.out).toContain(`done-without-evidence  1  Run ${RUN} task done.`);
    expect(c.out).not.toContain("Run specctx");
    p.write("openspec/changes/001-x/tasks.md", "# Tasks\n\n## 1. Alpha\n\n- [ ] 1.1 A. Verify: `test -d openspec`\n");
    const s = await p.run("task", "start", "001/1.1");
    expect(s.out).toContain(`Run ${RUN} query --change 001-x --kind req to list`);
    const j = JSON.parse((await p.run("task", "start", "001/1.1", "--json")).out);
    expect(j.hint).toContain(`Run ${RUN} query`);
    p.write("openspec/changes/001-x/tasks.md", "# Tasks\n\n## 1. Alpha\n\n- [ ] 1.1 A. [REQ-AAA-001] Verify: `test -d openspec`\n");
    const m = await p.run("task", "done", "001/1.1", "--manual", "by hand");
    expect(m.err).toContain(`Run it with ${RUN} task done 001/1.1.`);
  });

  test("SCN-CLI-010-2 the blocked line after the failure cap carries the prefix", async () => {
    await approvePlan();
    p.write("openspec/changes/001-x/tasks.md", "# Tasks\n\n## 1. Alpha\n\n- [ ] 1.1 A. [REQ-AAA-001] Verify: `false`\n");
    expect((await p.run("task", "start", "001/1.1")).code).toBe(0);
    let out = "";
    for (let i = 0; i < 3; i++) out = (await p.run("task", "done", "001/1.1")).out;
    expect(out).toMatch(new RegExp(`blocked: question \\d+ written. Run ${RUN} handoff resolve \\d+ "<answer>" to continue.`));
  });

  test("SCN-CLI-010-4 the help page keeps the bare name", async () => {
    const h = await p.run("help", "task", "start");
    expect(h.out).toContain("specctx task start");
    expect(h.out).not.toContain(RUN);
  });
});

describe("the run prefix on adopt and init", () => {
  test("SCN-CLI-010-2 adopt --dry-run ends with the prefixed command and still exits 1", async () => {
    const q = new Project(NO_ID_FIXTURE);
    try {
      q.write("spec-ctx.toml", `[cli]\nrun = "${RUN}"\n`);
      const r = await q.run("adopt", "--dry-run");
      expect(r.code).toBe(1);
      expect(r.out).toMatch(new RegExp(`headers need an ID\\. Next: ${RUN} adopt\\n$`));
    } finally {
      q.cleanup();
    }
  });

  test("SCN-CLI-010-2 init reads the key it keeps and prints the prefixed next step", async () => {
    const q = new Project(null);
    try {
      q.write("openspec/config.yaml", "schema: spec-driven\n");
      q.write("spec-ctx.toml", `[cli]\nrun = "${RUN}"\n`);
      q.write(".claude/skills/specctx-run/SKILL.md", "mine\n");
      const r = await q.run("init", "--all");
      expect(r.code).toBe(0);
      expect(r.out.trimEnd().split("\n").at(-1)).toBe(`next: ${RUN} init --all --force`);
      expect(q.read("spec-ctx.toml")).toBe(`[cli]\nrun = "${RUN}"\n`);
      expect((await q.run("init", "--all", "--force")).out.trimEnd().split("\n").at(-1)).toBe(`next: ${RUN} status`);
    } finally {
      q.cleanup();
    }
  });

  test("SCN-CLI-010-2 init without a key prints the default prefix", async () => {
    const q = new Project(null);
    try {
      q.write("openspec/config.yaml", "schema: spec-driven\n");
      expect((await q.run("init", "--all")).code).toBe(0);
      const again = await q.run("init", "--all");
      expect(again.out).toContain("nothing to do");
      expect(again.out.trimEnd().split("\n").at(-1)).toBe("next: specctx status");
    } finally {
      q.cleanup();
    }
  });
});
