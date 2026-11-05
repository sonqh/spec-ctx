// Covers: REQ-JRN-004, REQ-JRN-005
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanEnv, OPENSPEC_STUB, REPO } from "../helpers.ts";

const CLI = join(REPO, "dist/cli.js");
const dirs: string[] = [];
function repo(): string {
  const d = mkdtempSync(join(tmpdir(), "specctx-crep-"));
  dirs.push(d);
  const r = join(d, "repo");
  cpSync(join(REPO, "tests/fixtures/ctx-repo"), r, { recursive: true });
  return r;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
function cli(cwd: string, args: string[], journal = "0") {
  return spawnSync("node", [CLI, ...args], { cwd, encoding: "utf8", env: cleanEnv({ SPECCTX_JOURNAL: journal, SPECCTX_OPENSPEC: OPENSPEC_STUB }) });
}

describe("report through the CLI", () => {
  test("SCN-JRN-005-1 no journal exits 0 with a message, and writes nothing", () => {
    const d = repo();
    const r = cli(d, ["report"], "1");
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("no journal found under .ctx/local\n");
    expect(existsSync(join(d, ".ctx/local/runs.jsonl"))).toBe(true);
  });

  test("SCN-JRN-004-2 a report after real runs has the sections and writes only to stdout", () => {
    const d = repo();
    cli(d, ["status"], "1");
    cli(d, ["context", "REQ-AAA-001"], "1");
    const r = cli(d, ["report"], "0");
    expect(r.status).toBe(0);
    expect(r.stderr).toBe("");
    for (const h of ["## Versions", "## Config shape", "## North star", "## Time", "## Signals", "## Last internal error"]) expect(r.stdout).toContain(h);
    expect(r.stdout).toContain("| context | 1 |");
    expect(r.stdout).toContain("- context-has-code-or-test: 1");
    expect(r.stdout).toContain("gh issue create -R sonqh/spec-ctx --body-file <file>");
  });

  test("report runs with a broken config and rejects an argument", () => {
    const d = repo();
    mkdirSync(join(d, ".ctx/local"), { recursive: true });
    writeFileSync(join(d, ".ctx/local/runs.jsonl"), '{"at":"2026-11-05T10:00:00.000Z","cmd":"status","exit":0,"ms":5,"signals":[],"v":1,"version":"1"}\n');
    writeFileSync(join(d, "spec-ctx.toml"), "[[[bad");
    expect(cli(d, ["report"]).status).toBe(0);
    expect(cli(d, ["report", "x"]).status).toBe(2);
  });

  test("report --help prints its page", () => {
    const r = cli(REPO, ["report", "--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("specctx report");
  });
});
