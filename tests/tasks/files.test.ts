// Covers: REQ-TASK-009, REQ-TASK-010, REQ-TASK-004, SCN-TASK-009-1, SCN-TASK-009-2, SCN-TASK-010-1
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { namedFiles, snapshotBase, taskFiles, touchedSince, verifyFiles } from "../../src/tasks/files.ts";
import { evidenceRel } from "../../src/tasks/tasks.ts";
import { sha256 } from "../../src/util/hash.ts";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function env(): NodeJS.ProcessEnv {
  const e: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(process.env)) if (!k.startsWith("GIT_")) e[k] = v;
  return { ...e, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };
}
function git(cwd: string, ...args: string[]): void {
  const r = spawnSync("git", args, { cwd, env: env() });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
}
function put(root: string, rel: string, text: string): void {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}
/** A temp git repo with one commit. `sub` makes the project root a subfolder of it. */
function repo(sub = ""): { top: string; root: string } {
  const top = mkdtempSync(join(tmpdir(), "specctx-files-"));
  dirs.push(top);
  git(top, "init", "-q");
  const root = sub ? join(top, sub) : top;
  mkdirSync(root, { recursive: true });
  put(root, "src/a.ts", "a\n");
  put(root, "src/b.ts", "b\n");
  put(root, ".gitignore", "dist/\n");
  git(top, "add", "-A");
  git(top, "commit", "-q", "-m", "one");
  return { top, root };
}
const task = (paths: string[], command: string | null = null) => ({ id: "002/2.1", entry: { paths } as never, verify: { kind: "command", command } as never });

describe("named and Verify files", () => {
  test("a named file counts and a named directory does not", () => {
    const { root } = repo();
    expect(namedFiles(root, ["src/a.ts", "src", "src/none.ts"])).toEqual(["src/a.ts"]);
  });

  test("a Verify path counts, and an ignored path adds nothing", () => {
    const { root } = repo();
    put(root, "dist/cli.js", "x\n");
    expect(verifyFiles(root, root, "node dist/cli.js lint src/a.ts && bun test src/b.ts")).toEqual(["src/a.ts", "src/b.ts"]);
  });

  test("an absolute token and a ../ token add nothing", () => {
    const { root } = repo();
    expect(verifyFiles(root, root, "/bin/sh ../x src/a.ts")).toEqual(["src/a.ts"]);
  });

  test("tokens with ; ( ) and a VAR= prefix resolve, and a directory is not expanded", () => {
    const { root } = repo();
    expect(verifyFiles(root, root, "(FOO=src/a.ts; test -f src/b.ts); bun test src")).toEqual(["src/a.ts", "src/b.ts"]);
  });

  test("a Verify path resolves against the Verify directory first", () => {
    const { root } = repo();
    put(root, "sub/x.ts", "x\n");
    expect(verifyFiles(root, join(root, "sub"), "cat x.ts")).toEqual(["sub/x.ts"]);
  });
});

describe("base and diff", () => {
  test("SCN-TASK-009-1 the base lists a changed and an untracked file with their digests", () => {
    const { root } = repo();
    put(root, "src/a.ts", "a2\n");
    put(root, "src/new.ts", "n\n");
    const b = snapshotBase(root)!;
    expect(b.head).toMatch(/^[0-9a-f]{40}$/);
    expect(b.files).toEqual({ "src/a.ts": sha256("a2\n"), "src/new.ts": sha256("n\n") });
  });

  test("SCN-TASK-009-1 an edit, a new file, a staged file, and a commit each count", () => {
    const { top, root } = repo();
    put(root, "src/a.ts", "a2\n");
    const b = snapshotBase(root)!;
    put(root, "src/b.ts", "b2\n");
    put(root, "src/c.ts", "c\n");
    put(root, "src/d.ts", "d\n");
    git(top, "add", "src/d.ts");
    put(root, "src/e.ts", "e\n");
    git(top, "add", "src/e.ts");
    git(top, "commit", "-q", "-m", "two");
    // src/a.ts has the same digest as at start, so it does not count
    expect(touchedSince(root, b)).toEqual(["src/b.ts", "src/c.ts", "src/d.ts", "src/e.ts"]);
  });

  test("a file changed again after start counts", () => {
    const { root } = repo();
    put(root, "src/a.ts", "a2\n");
    const b = snapshotBase(root)!;
    put(root, "src/a.ts", "a3\n");
    expect(touchedSince(root, b)).toEqual(["src/a.ts"]);
  });

  test("a deleted file does not count", () => {
    const { root } = repo();
    const b = snapshotBase(root)!;
    rmSync(join(root, "src/b.ts"));
    expect(touchedSince(root, b)).toEqual([]);
  });

  test(".ctx, .claude, and any tasks.md stay out, and an ignored file stays out", () => {
    const { root } = repo();
    const b = snapshotBase(root)!;
    put(root, ".ctx/evidence/x.json", "{}\n");
    put(root, ".claude/skills/s.md", "s\n");
    put(root, "openspec/changes/c/tasks.md", "t\n");
    put(root, "dist/out.js", "o\n");
    put(root, "src/ok.ts", "ok\n");
    expect(touchedSince(root, b)).toEqual(["src/ok.ts"]);
  });

  test("a non-ASCII path works", () => {
    const { root } = repo();
    const b = snapshotBase(root)!;
    put(root, "src/café 中.ts", "x\n");
    expect(touchedSince(root, b)).toEqual(["src/café 中.ts"]);
  });

  test("a project root in a subfolder gives root relative paths", () => {
    const { root } = repo("proj");
    put(root.replace(/proj$/, ""), "outside.ts", "o\n");
    const b = snapshotBase(root)!;
    put(root, "src/new.ts", "n\n");
    expect(touchedSince(root, b)).toEqual(["src/new.ts"]);
  });

  test("a repo with no commit and a project with no git give no base", () => {
    const top = mkdtempSync(join(tmpdir(), "specctx-files-"));
    dirs.push(top);
    expect(snapshotBase(top)).toBeNull();
    git(top, "init", "-q");
    put(top, "a.ts", "a\n");
    expect(snapshotBase(top)).toBeNull();
  });

  test("a GIT_DIR in the environment does not reach the git calls", () => {
    const a = repo();
    const b = repo();
    put(b.root, "src/z.ts", "z\n");
    git(b.top, "add", "-A");
    git(b.top, "commit", "-q", "-m", "two");
    const old = process.env.GIT_DIR;
    process.env.GIT_DIR = join(b.top, ".git");
    try {
      const base = snapshotBase(a.root)!;
      const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: a.root, env: env() }).stdout.toString().trim();
      expect(base.head).toBe(head);
    } finally {
      if (old === undefined) delete process.env.GIT_DIR;
      else process.env.GIT_DIR = old;
    }
  });

  test("a bogus head is base lost", () => {
    const { root } = repo();
    expect(touchedSince(root, { head: "0".repeat(40), files: {} })).toBeNull();
  });
});

describe("taskFiles", () => {
  test("the three sources join, and a tag alone adds nothing", () => {
    const { root } = repo();
    put(root, "src/tagged.ts", "// " + "REQ-" + "TASK-001\n");
    const b = snapshotBase(root);
    put(root, "src/c.ts", "c\n");
    const r = taskFiles(root, task(["src/a.ts"], "bun test src/b.ts"), root, { task: "002/2.1", base: b! });
    expect(Object.keys(r.files)).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"]);
    expect(r.diff).toEqual(["src/c.ts"]);
    expect(r.files["src/c.ts"]).toBe(sha256("c\n"));
    expect(r.note).toBeNull();
  });

  test("SCN-TASK-009-2 each cause gives one note", () => {
    const { root } = repo();
    const t = task(["src/a.ts"]);
    expect(taskFiles(root, t, root, null).note).toBe("note: no diff base for 002/2.1 (no task start). Evidence files hold the named and Verify files only.");
    expect(taskFiles(root, t, root, { task: "002/2.1", base: { head: "0".repeat(40), files: {} } }).note).toContain("(base lost)");
    expect(taskFiles(root, t, root, { task: "002/9.9", base: snapshotBase(root)! }).note).toContain("(no task start)");
    const bare = mkdtempSync(join(tmpdir(), "specctx-files-"));
    dirs.push(bare);
    put(bare, "src/a.ts", "a\n");
    const r = taskFiles(bare, t, bare, { task: "002/2.1" });
    expect(r.note).toContain("(no git repo)");
    expect(Object.keys(r.files)).toEqual(["src/a.ts"]);
  });

  test("SCN-TASK-010-1 a reopened copy with diff carries its existing paths", () => {
    const { root } = repo();
    put(root, "src/c.ts", "c\n");
    const rel = evidenceRel({ id: "002/2.1" }).replace(/\.json$/, ".reopened-1.json");
    put(root, rel, JSON.stringify({ diff: ["src/c.ts", "src/gone.ts", "openspec/changes/c/tasks.md"], files: { "src/a.ts": "x" } }));
    const r = taskFiles(root, task([]), root, null);
    expect(r.diff).toEqual(["src/c.ts"]);
    expect(Object.keys(r.files)).toEqual(["src/c.ts"]);
    expect(r.note).toContain("no task start");
    expect(r.note).toContain("carried");
  });

  test("a reopened copy from before change 066 carries nothing", () => {
    const { root } = repo();
    const rel = evidenceRel({ id: "002/2.1" }).replace(/\.json$/, ".reopened-1.json");
    put(root, rel, JSON.stringify({ files: { "src/a.ts": "x", "src/b.ts": "y" } }));
    const r = taskFiles(root, task([]), root, null);
    expect(r.diff).toEqual([]);
    expect(r.files).toEqual({});
    expect(existsSync(join(root, rel))).toBe(true);
    expect(r.note).not.toContain("carried");
  });
});
