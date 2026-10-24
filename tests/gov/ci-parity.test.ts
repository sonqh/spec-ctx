// Covers: REQ-GOV-004, REQ-GOV-005
import { afterEach, describe, expect, test } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPO } from "../helpers.ts";

const ci = readFileSync(join(REPO, ".github/workflows/ci.yml"), "utf8");
const local = readFileSync(join(REPO, "scripts/ci-local.sh"), "utf8");
const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** The run lines of one job in ci.yml. Each run of the specs and code jobs is one line. */
function runs(job: string): string[] {
  const start = ci.indexOf(`\n  ${job}:\n`);
  const rest = ci.slice(start + 1);
  const end = rest.slice(1).search(/\n {2}[a-z]+:\n/);
  const body = end < 0 ? rest : rest.slice(0, end + 1);
  return [...body.matchAll(/^ {6}- run: (.+)$/gm)].map((m) => m[1]!.trim());
}

describe("CI and the local gate", () => {
  test("SCN-GOV-004-2 every run line of the code and specs jobs appears in scripts/ci-local.sh", () => {
    const all = [...runs("specs"), ...runs("code")];
    expect(all.length).toBeGreaterThan(8);
    for (const r of all) expect(local, r).toContain(`'${r}'`);
  });

  test("SCN-GOV-004-1 the pre-push hook blocks a push and names the failing step", () => {
    const tmp = mkdtempSync(join(tmpdir(), "specctx-push-"));
    dirs.push(tmp);
    const repo = join(tmp, "repo");
    execFileSync("git", ["init", "-q", "--bare", join(tmp, "remote.git")]);
    mkdirSync(join(repo, "scripts"), { recursive: true });
    mkdirSync(join(repo, ".githooks"));
    cpSync(join(REPO, ".githooks/pre-push"), join(repo, ".githooks/pre-push"));
    writeFileSync(join(repo, "scripts/ci-local.sh"), "echo 'ci-local: bun run test'\necho 'ci-local: fail: bun run test'\nexit 1\n");
    chmodSync(join(repo, ".githooks/pre-push"), 0o755);
    const git = (...a: string[]) => spawnSync("git", a, { cwd: repo, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } });
    git("init", "-q");
    git("config", "core.hooksPath", ".githooks");
    git("add", "-A");
    git("commit", "-q", "-m", "x");
    git("remote", "add", "origin", join(tmp, "remote.git"));
    const r = git("push", "-q", "origin", "HEAD:main");
    expect(r.status).not.toBe(0);
    expect(r.stdout + r.stderr).toContain("ci-local: fail: bun run test");
    const skip = spawnSync("git", ["push", "-q", "origin", "HEAD:main"], { cwd: repo, encoding: "utf8", env: { ...process.env, SPECCTX_SKIP_PUSH_GATE: "1" } });
    expect(skip.status).toBe(0);
    expect(skip.stdout + skip.stderr).toContain("push gate skipped");
  });

  test("SCN-GOV-005-1 a docs-only push skips the code job", () => {
    expect(ci).toMatch(/on:\n {2}push:\n {4}branches: \[main\]\n {2}pull_request:\n/);
    expect(ci).toContain("    needs: changes\n    if: needs.changes.outputs.code == 'true'\n");
    const tmp = mkdtempSync(join(tmpdir(), "specctx-changes-"));
    dirs.push(tmp);
    const git = (...a: string[]) => execFileSync("git", a, { cwd: tmp, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } });
    git("init", "-q");
    writeFileSync(join(tmp, "README.md"), "a\n");
    git("add", "-A");
    git("commit", "-q", "-m", "a");
    const base = git("rev-parse", "HEAD").trim();
    mkdirSync(join(tmp, "docs"));
    writeFileSync(join(tmp, "docs/x.md"), "b\n");
    git("add", "-A");
    git("commit", "-q", "-m", "b");
    const changes = (b: string) => execFileSync("bash", [join(REPO, "scripts/ci-changes.sh"), b], { cwd: tmp, encoding: "utf8" });
    expect(changes(base)).toBe("code=false\n");
    mkdirSync(join(tmp, "src"));
    writeFileSync(join(tmp, "src/a.ts"), "c\n");
    git("add", "-A");
    git("commit", "-q", "-m", "c");
    expect(changes(base)).toBe("code=true\n");
    expect(changes("0000000000000000000000000000000000000000")).toBe("code=true\n");
  });

  test("SCN-GOV-005-2 a newer push cancels the older run", () => {
    expect(ci).toContain("concurrency:\n  group: ci-${{ github.ref }}\n  cancel-in-progress: true\n");
  });

  test("package.json has ci:local and CLAUDE.md states the rule", () => {
    expect(JSON.parse(readFileSync(join(REPO, "package.json"), "utf8")).scripts["ci:local"]).toBe("bash scripts/ci-local.sh");
    expect(readFileSync(join(REPO, "CLAUDE.md"), "utf8")).toContain("Run `bun run ci:local` before every push.");
  });
});
