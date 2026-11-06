// Covers: REQ-JRN-001, REQ-JRN-002, REQ-JRN-006, REQ-QRY-019
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanEnv, OPENSPEC_STUB, REPO } from "../helpers.ts";

const CLI = join(REPO, "dist/cli.js");
const dirs: string[] = [];
function repo(): string {
  const d = mkdtempSync(join(tmpdir(), "specctx-sig-"));
  dirs.push(d);
  const r = join(d, "repo");
  cpSync(join(REPO, "tests/fixtures/ctx-repo"), r, { recursive: true });
  return r;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(join(d), { recursive: true, force: true });
});
function cli(cwd: string, args: string[]) {
  return spawnSync("node", [CLI, ...args], { cwd, encoding: "utf8", env: cleanEnv({ SPECCTX_JOURNAL: "1", SPECCTX_OPENSPEC: OPENSPEC_STUB }) });
}
const journalOf = (d: string): Record<string, unknown>[] =>
  readFileSync(join(d, ".ctx/local/runs.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));

describe("journal through the CLI", () => {
  test("SCN-JRN-001-1 a status run writes one line with the fixed keys", () => {
    const d = repo();
    expect(cli(d, ["status"]).status).toBe(0);
    const lines = journalOf(d);
    expect(lines).toHaveLength(1);
    expect(Object.keys(lines[0]!)).toEqual(["at", "cmd", "exit", "ms", "signals", "v", "version"]);
    expect(lines[0]).toMatchObject({ cmd: "status", exit: 0, signals: [], v: 1 });
    expect(readFileSync(join(d, ".ctx/local/.gitignore"), "utf8")).toBe("*\n");
  });

  test("SCN-JRN-001-1 no flag value, path, or ID reaches the line", () => {
    const d = repo();
    cli(d, ["context", "REQ-AAA-001", "--budget", "4321"]);
    const text = readFileSync(join(d, ".ctx/local/runs.jsonl"), "utf8");
    for (const s of ["REQ-AAA", "4321", d, "src/a.ts"]) expect(text).not.toContain(s);
    expect(text.length).toBeLessThan(4096);
  });

  test("SCN-JRN-002-1 context signals: code or test, then no links", () => {
    const d = repo();
    writeFileSync(join(d, "notes.txt"), "plain\n");
    const a = cli(d, ["context", "REQ-AAA-001"]);
    expect(a.status).toBe(0);
    const b = cli(d, ["context", "notes.txt"]);
    expect(b.stdout).toContain("no links");
    const [first, second] = journalOf(d);
    expect(first).toMatchObject({ cmd: "context", signals: ["context-has-code-or-test"] });
    expect(second).toMatchObject({ cmd: "context", signals: ["empty-context"] });
  });

  test("SCN-JRN-002-2 a small budget gives truncated-context, and bundle gives no block signal", () => {
    const d = repo();
    cli(d, ["context", "REQ-AAA-001", "--budget", "100"]);
    cli(d, ["bundle", "REQ-AAA-001", "--budget", "100"]);
    const [ctx, bun] = journalOf(d);
    expect(ctx!.signals).toContain("truncated-context");
    expect(bun).toMatchObject({ cmd: "bundle", signals: [] });
  });

  test("SCN-JRN-002-2 a card with the marker and no omitted entry gives truncated-context", () => {
    const d = repo();
    // the largest budget whose output holds a marker and no trailer: the answer is incomplete through body_omitted only
    let found = 0;
    for (let n = 3000; n >= 100 && !found; n -= 50) {
      const r = cli(d, ["bundle", "REQ-AAA-001", "--budget", String(n)]);
      if (r.stdout.includes(" | body omitted\n") && !r.stdout.includes("truncated:")) found = n;
    }
    expect(found).toBeGreaterThan(0);
    cli(d, ["context", "REQ-AAA-001", "--budget", String(found)]);
    const last = journalOf(d).filter((l) => l.cmd === "context").pop()!;
    expect(last.signals).toContain("truncated-context");
  });

  test("SCN-JRN-002-2 a usage error with a known command keeps its name and gives usage-error", () => {
    const d = repo();
    expect(cli(d, ["context"]).status).toBe(2);
    expect(journalOf(d)[0]).toMatchObject({ cmd: "context", exit: 2, signals: ["usage-error"] });
  });

  test("SCN-JRN-002-3 and SCN-JRN-006-1 an internal error gives err with package frames only, and the hint line", () => {
    const d = repo();
    expect(cli(d, ["build"]).status).toBe(0);
    const idx = JSON.parse(readFileSync(join(d, ".ctx/index.json"), "utf8"));
    writeFileSync(join(d, ".ctx/index.json"), JSON.stringify({ ...idx, entries: 7 }));
    writeFileSync(join(d, "spec-ctx.toml"), '[cli]\nrun = "node dist/cli.js"\n');
    const r = cli(d, ["query", "lockfile"]);
    expect(r.status).toBe(3);
    const last = r.stderr.trimEnd().split("\n").pop()!;
    expect(last).toBe("Run node dist/cli.js report and file the output at https://github.com/sonqh/spec-ctx/issues.");
    const line = journalOf(d).pop()!;
    expect(line).toMatchObject({ cmd: "query", exit: 3 });
    expect(line.signals).toEqual(["internal-error"]);
    const err = line.err as { name: string; code: string | null; frames: string[] };
    expect(err.name).toMatch(/\w+/);
    expect(err.frames.length).toBeGreaterThan(0);
    for (const f of err.frames) expect(f).toMatch(/^(dist|src)\/[\w./-]+:\d+$/);
    expect(JSON.stringify(line)).not.toContain(d);
  });

  test("SCN-JRN-006-1 the hint uses the plain name with no config prefix", () => {
    const d = repo();
    expect(cli(d, ["build"]).status).toBe(0);
    const idx = JSON.parse(readFileSync(join(d, ".ctx/index.json"), "utf8"));
    writeFileSync(join(d, ".ctx/index.json"), JSON.stringify({ ...idx, entries: 7 }));
    const r = cli(d, ["query", "lockfile"]);
    expect(r.stderr.trimEnd().split("\n").pop()).toContain("Run specctx report");
  });

  test("init writes init-ok in a new project", () => {
    const t = mkdtempSync(join(tmpdir(), "specctx-init-"));
    dirs.push(t);
    spawnSync("mkdir", ["-p", join(t, "openspec")]);
    const r = cli(t, ["init"]);
    expect(r.status).toBe(0);
    expect(journalOf(t)[0]).toMatchObject({ cmd: "init", exit: 0, signals: ["init-ok"] });
  });
});
