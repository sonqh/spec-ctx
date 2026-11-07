// Covers: REQ-TASK-009, REQ-TASK-010, REQ-TASK-004, SCN-TASK-009-1, SCN-TASK-009-2, SCN-TASK-010-1, SCN-TASK-004-2
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { Project, TAG, cleanEnv } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const TASKS = "openspec/changes/002-t/tasks.md";

function git(pr: Project, ...args: string[]): void {
  const r = spawnSync("git", args, { cwd: pr.root, env: cleanEnv({ GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" }) });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
}

/** Two tasks. Task 2.1 cites REQ-AAA-001, which `src/f.ts` carries as a tag. Neither task line names `src/f.ts`. */
function setup(useGit: boolean): Project {
  const pr = new Project();
  delete process.env.SPECCTX_RERUN;
  pr.write(TASKS, "# Tasks\n\n- [ ] 2.1 A. [REQ-AAA-001] Verify: `node -e 0`\n- [ ] 2.2 B. [REQ-AAA-002] Verify: `node -e 0`\n");
  pr.write("src/f.ts", TAG + "AAA-001\nexport const f = 1;\n");
  pr.write(".gitignore", ".ctx/index.json\n.ctx/current.json\n");
  if (useGit) {
    git(pr, "init", "-q");
    git(pr, "add", "-A");
    git(pr, "commit", "-q", "-m", "base");
  }
  return pr;
}
const ev = (id: string): { files: Record<string, string>; diff: string[] } => JSON.parse(p.read(`.ctx/evidence/002/${id}.json`));

describe("stale by tag", () => {
  test("replay: task B edits the file that A only tags, and A stays fresh", async () => {
    p = setup(true);
    expect((await p.run("task", "start", "002/2.1")).code).toBe(0);
    expect((await p.run("task", "done", "002/2.1")).code).toBe(0);
    expect(ev("2.1").files).toEqual({});
    expect((await p.run("task", "start", "002/2.2")).code).toBe(0);
    p.append("src/f.ts", "export const g = 2;\n");
    expect((await p.run("task", "done", "002/2.2")).code).toBe(0);
    expect(Object.keys(ev("2.2").files)).toEqual(["src/f.ts"]);
    expect(ev("2.2").diff).toEqual(["src/f.ts"]);
    const c = await p.run("check", "--strict");
    expect(c.out).not.toContain("stale-evidence  002/2.1");
  });

  test("SCN-TASK-009-1 the base sits in current.json and never in the evidence", async () => {
    p = setup(true);
    await p.run("task", "start", "002/2.1");
    const cur = JSON.parse(p.read(".ctx/current.json"));
    expect(cur.base.head).toMatch(/^[0-9a-f]{40}$/);
    p.write("src/new.ts", "n\n");
    await p.run("task", "done", "002/2.1");
    expect(ev("2.1").diff).toEqual(["src/new.ts"]);
    expect(JSON.stringify(ev("2.1"))).not.toContain(cur.base.head);
    expect(Object.keys(JSON.parse(p.read(".ctx/evidence/002/2.1.json")))).not.toContain("base");
  });

  test("no recorded file comes from a tag alone", async () => {
    p = setup(true);
    p.write("src/g.ts", TAG + "AAA-001\n");
    await p.run("task", "start", "002/2.1");
    p.write("src/h.ts", "h\n");
    await p.run("task", "done", "002/2.1");
    const e = ev("2.1");
    expect(Object.keys(e.files).sort()).toEqual(e.diff);
    expect(e.files).not.toHaveProperty("src/f.ts");
    expect(e.files).not.toHaveProperty("src/g.ts");
  });

  test("SCN-TASK-009-2 a project with no git gives the no git repo note, and a git repo with no start gives the no task start note", async () => {
    p = setup(false);
    const a = await p.run("task", "done", "002/2.1");
    expect(a.code).toBe(0);
    expect(a.err).toContain("note: no diff base for 002/2.1 (no git repo). Evidence files hold the named and Verify files only.\n");
    await p.run("task", "start", "002/2.2");
    expect(JSON.parse(p.read(".ctx/current.json"))).not.toHaveProperty("base");
    const b = await p.run("task", "done", "002/2.2");
    expect(b.err).toContain("(no git repo)");
    p.cleanup();
    p = setup(true);
    const c = await p.run("task", "done", "002/2.1");
    expect(c.err).toContain("note: no diff base for 002/2.1 (no task start). Evidence files hold the named and Verify files only.\n");
  });

  test("a bogus head in current.json gives the base lost note", async () => {
    p = setup(true);
    await p.run("task", "start", "002/2.1");
    const cur = JSON.parse(p.read(".ctx/current.json"));
    cur.base.head = "0".repeat(40);
    p.write(".ctx/current.json", JSON.stringify(cur));
    const r = await p.run("task", "done", "002/2.1");
    expect(r.err).toContain("(base lost)");
    expect(r.code).toBe(0);
  });

  test("SCN-TASK-010-1 reopen then done keeps the diff file, and a pre-066 copy carries nothing", async () => {
    p = setup(true);
    await p.run("task", "start", "002/2.1");
    p.write("src/new.ts", "n\n");
    await p.run("task", "done", "002/2.1");
    await p.run("task", "reopen", "002/2.1", "again");
    const r = await p.run("task", "done", "002/2.1");
    expect(r.code).toBe(0);
    expect(r.err).toContain("carried diff");
    expect(ev("2.1").diff).toEqual(["src/new.ts"]);
    expect(Object.keys(ev("2.1").files)).toEqual(["src/new.ts"]);
    // a copy from before change 066 holds files and no diff field
    await p.run("task", "reopen", "002/2.1", "old");
    p.write(".ctx/evidence/002/2.1.reopened-2.json", JSON.stringify({ files: { "src/f.ts": "x" } }));
    const old = await p.run("task", "done", "002/2.1");
    expect(old.code).toBe(0);
    expect(ev("2.1").files).toEqual({});
  });
});
