// Covers: REQ-CLI-007, REQ-LOOP-001
import { existsSync, rmSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { NO_ID_FIXTURE, OPENSPEC_STUB, Project } from "../helpers.ts";

let p: Project | undefined;
// status and next both run the OpenSpec status command, so both get the stand-in (030/D4)
beforeEach(() => {
  process.env.SPECCTX_OPENSPEC = OPENSPEC_STUB;
});
afterEach(() => {
  delete process.env.SPECCTX_OPENSPEC;
  p?.cleanup();
  p = undefined;
});

const last = (s: string): string => s.trimEnd().split("\n").at(-1)!;
const TASKS = (body: string) => `# Tasks\n\n## 1. Group\n\n${body}`;

/** The last line of status, and the next: line built from the command of next --json. */
async function both(q: Project): Promise<{ status: string; next: string; code: number }> {
  const s = await q.run("status");
  const n = await q.run("next", "--json");
  expect(n.code, n.err).toBe(0);
  const cmd = (JSON.parse(n.out) as { command: string | null }).command;
  return { status: last(s.out), next: `next: ${cmd ?? "none"}`, code: s.code };
}

describe("next step lines", () => {
  test("SCN-CLI-007-2 status with an open task and no current task ends with the start command of next", async () => {
    p = new Project();
    p.write("openspec/changes/001-x/tasks.md", TASKS("- [ ] 1.1 A. [REQ-AAA-001] Verify: `test -d openspec`\n"));
    const r = await both(p);
    expect(r.status).toBe("next: specctx task start 001/1.1");
    expect(r.status).toBe(r.next);
  });

  test("SCN-CLI-007-5 status with no active change ends with the plan command of next", async () => {
    p = new Project();
    p.write("openspec/specs/gamma/spec.md", "# gamma\n\n## Requirements\n\n### Requirement: REQ-AAA-007 Seven\nText.\n\n#### Scenario: SCN-AAA-007-1 S\n- a\n");
    rmSync(p.path("openspec/changes/001-x"), { recursive: true, force: true });
    const s = await p.run("status");
    expect(s.out).toContain("no active change");
    const r = await both(p);
    expect(r.status).toBe(`next: ${OPENSPEC_STUB} new change <name>`);
    expect(r.status).toBe(r.next);
  });

  test("SCN-CLI-007-6 status with every task done ends with the gate command, then the archive command", async () => {
    p = new Project();
    p.write("openspec/changes/001-x/tasks.md", TASKS("- [ ] 1.1 A. [REQ-AAA-001] Verify: `test -d openspec`\n"));
    const d = await p.run("task", "done", "001/1.1");
    expect(d.code, d.err).toBe(0);
    let r = await both(p);
    expect(r.status).toBe("next: specctx gate --strict");
    expect(r.status).toBe(r.next);
    p.write(".ctx/gate-log.jsonl", JSON.stringify({ at: "9999-12-31T00:00:00.000Z", ok: true }) + "\n");
    r = await both(p);
    expect(r.status).toBe(`next: ${OPENSPEC_STUB} archive 001-x -y`);
    expect(r.status).toBe(r.next);
  });

  test("SCN-CLI-007-7 status with a failed OpenSpec command ends with next: none and exits 0", async () => {
    p = new Project();
    process.env.SPECCTX_OPENSPEC = "/bin/false";
    const r = await both(p);
    expect(r.code).toBe(0);
    expect(r.status).toBe("next: none");
    expect(r.status).toBe(r.next);
  });

  test("SCN-CLI-007-3 init --all twice: the second run prints nothing to do", async () => {
    p = new Project(null);
    const a = await p.run("init", "--all");
    expect(a.code, a.err).toBe(0);
    expect(last(a.out)).toBe("next: specctx status");
    const b = await p.run("init", "--all");
    expect(b.code, b.err).toBe(0);
    // the templates line stays on a nothing to do run (018/D5)
    expect(b.out).toBe("nothing to do\ntemplates: openspec/templates/spec-driven-ids/ (spec.md, tasks.md hold the ID placeholders)\nnext: specctx status\n");
  });

  test("adopt --dry-run with work ends with the next step and still exits 1", async () => {
    p = new Project(NO_ID_FIXTURE);
    const r = await p.run("adopt", "--dry-run");
    expect(r.code).toBe(1);
    expect(last(r.out)).toMatch(/^exit 1: \d+ headers need an ID\. Next: specctx adopt$/);
  });

  test("SCN-CLI-007-4 adopt with nothing to do writes no report", async () => {
    p = new Project();
    // a config whose caps differ from the plan still writes no report
    p.write("spec-ctx.toml", "[ids]\ncaps = []\n");
    const r = await p.run("adopt");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("nothing to adopt");
    expect(existsSync(p.path("adopt-report.md"))).toBe(false);
  });
});
