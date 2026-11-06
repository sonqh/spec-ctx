// Covers: REQ-JRN-001, REQ-JRN-002, REQ-JRN-003
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../src/main.ts";
import { cleanEnv, REPO } from "../helpers.ts";

const CLI = join(REPO, "dist/cli.js");
const dirs: string[] = [];
function repo(withOpenspec: boolean): string {
  const d = mkdtempSync(join(tmpdir(), "specctx-entry-"));
  dirs.push(d);
  if (withOpenspec) mkdirSync(join(d, "openspec"));
  return d;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
function cli(cwd: string, args: string[], journal: "0" | "1") {
  return spawnSync("node", [CLI, ...args], { cwd, encoding: "utf8", env: cleanEnv({ SPECCTX_JOURNAL: journal }) });
}
const journalOf = (d: string): Record<string, unknown>[] =>
  readFileSync(join(d, ".ctx/local/runs.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));

describe("the bin entry", () => {
  test("SCN-JRN-001-2 --version and --help write nothing, with or without openspec", () => {
    for (const withOs of [true, false]) {
      const d = repo(withOs);
      expect(cli(d, ["--version"], "1").status).toBe(0);
      expect(cli(d, ["--help"], "1").status).toBe(0);
      expect(cli(d, ["help", "query"], "1").status).toBe(0);
      expect(existsSync(join(d, ".ctx")), `openspec ${withOs}`).toBe(false);
    }
  });

  test("SCN-JRN-001-2 an unknown command with no openspec folder writes nothing", () => {
    const d = repo(false);
    expect(cli(d, ["frobnicate"], "1").status).toBe(2);
    expect(existsSync(join(d, ".ctx"))).toBe(false);
  });

  test("SCN-JRN-002-2 an unknown command in a repo gives cmd ?, exit 2, and usage-error", () => {
    const d = repo(true);
    const r = cli(d, ["frobnicate", "secret-value"], "1");
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("unknown command");
    const [line] = journalOf(d);
    expect(line).toMatchObject({ cmd: "?", exit: 2, signals: ["usage-error"], v: 1 });
    expect(JSON.stringify(line)).not.toContain("secret");
    expect(readFileSync(join(d, ".ctx/local/.gitignore"), "utf8")).toBe("*\n");
  });

  test("a parse error and a group with no subcommand give cmd ?, and --root blocks the fallback", () => {
    const d = repo(true);
    expect(cli(d, ["status", "--nope"], "1").status).toBe(2);
    expect(cli(d, ["task"], "1").status).toBe(2);
    expect(journalOf(d).map((l) => l.cmd)).toEqual(["?", "?"]);
    const e = repo(true);
    const other = repo(false);
    expect(cli(other, ["frobnicate", "--root", e], "1").status).toBe(2);
    expect(existsSync(join(e, ".ctx"))).toBe(false);
  });

  test("SCN-JRN-003-2 the switch 0 writes nothing and does not change the output", () => {
    const d = repo(true);
    const off = cli(d, ["frobnicate"], "0");
    expect(existsSync(join(d, ".ctx"))).toBe(false);
    const on = cli(d, ["frobnicate"], "1");
    expect(on.status).toBe(off.status);
    expect(on.stdout).toBe(off.stdout);
    expect(on.stderr).toBe(off.stderr);
  });

  test("SCN-JRN-003-2 a plain file at .ctx/local keeps exit code and output", () => {
    const d = repo(true);
    mkdirSync(join(d, ".ctx"));
    spawnSync("sh", ["-c", "echo x > .ctx/local"], { cwd: d });
    const r = cli(d, ["frobnicate"], "1");
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("unknown command");
  });
});

describe("in process", () => {
  test("SCN-JRN-001-3 main() with no sink writes no journal, also for an unknown command", async () => {
    const d = repo(true);
    for (const argv of [["frobnicate"], ["--version"], ["status", "--nope"]]) {
      await main(argv, { cwd: d, out: () => {}, err: () => {} });
    }
    expect(existsSync(join(d, ".ctx"))).toBe(false);
  });

  test("main() fills the sink and still writes nothing itself", async () => {
    const d = repo(true);
    const journal = { signals: new Set<string>() };
    await main(["frobnicate"], { cwd: d, out: () => {}, err: () => {}, journal });
    expect(journal).toMatchObject({ cmd: "?" });
    expect(existsSync(join(d, ".ctx"))).toBe(false);
  });
});
