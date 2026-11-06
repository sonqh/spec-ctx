// Covers: REQ-JRN-004, REQ-JRN-005
import { afterEach, describe, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildReport, configShape, p95 } from "../../src/journal/report.ts";

const dirs: string[] = [];
function repo(): string {
  const d = mkdtempSync(join(tmpdir(), "specctx-rep-"));
  dirs.push(d);
  mkdirSync(join(d, ".ctx/local"), { recursive: true });
  return d;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
const SYS = { version: "9.9.9", node: "v22.0.0", platform: "linux", arch: "x64" };
const NOW = new Date("2026-11-05T12:00:00.000Z");
const at = (min: number): string => new Date(Date.parse("2026-11-05T10:00:00.000Z") + min * 60000).toISOString();
const rec = (min: number, cmd: string, signals: string[] = [], extra: object = {}, ms = 10): string =>
  JSON.stringify({ at: at(min), cmd, exit: 0, ms, signals, v: 1, version: "9.9.9", ...extra });
const put = (d: string, name: string, lines: string[]): void => writeFileSync(join(d, ".ctx/local", name), lines.join("\n") + "\n");

describe("report", () => {
  test("SCN-JRN-004-1 minutes and runs from init-ok to the first context line", () => {
    const d = repo();
    put(d, "runs.jsonl", [rec(0, "init", ["init-ok"]), rec(2, "status"), rec(4, "build"), rec(10, "context", ["context-has-code-or-test"])]);
    const { text } = buildReport(d, NOW, SYS);
    expect(text).toContain("to the first `context-has-code-or-test`: 10.0");
    expect(text).toContain("Runs between them: 3");
  });

  test("SCN-JRN-004-1 no context line gives n/a, and so does no init-ok", () => {
    const d = repo();
    put(d, "runs.jsonl", [rec(0, "init", ["init-ok"]), rec(1, "status")]);
    expect(buildReport(d, NOW, SYS).text).toContain("context-has-code-or-test`: n/a");
    put(d, "runs.jsonl", [rec(0, "context", ["context-has-code-or-test"])]);
    expect(buildReport(d, NOW, SYS).text).toContain("context-has-code-or-test`: n/a");
  });

  test("both files are read in order and a bad line is skipped", () => {
    const d = repo();
    put(d, "runs.1.jsonl", [rec(0, "init", ["init-ok"]), "not json {", '{"v":2,"at":"x"}']);
    put(d, "runs.jsonl", [rec(3, "context", ["context-has-code-or-test"]), "", "[1]"]);
    const { text } = buildReport(d, NOW, SYS);
    expect(text).toContain("to the first `context-has-code-or-test`: 3.0");
    expect(text).toContain("- Total: 2");
  });

  test("p95 of one run and of many runs, per cmd, with signal counts", () => {
    expect(p95([7])).toBe(7);
    expect(p95(Array.from({ length: 100 }, (_, i) => i + 1))).toBe(95);
    const d = repo();
    put(d, "runs.jsonl", [rec(0, "status", [], {}, 30), rec(1, "status", ["usage-error"], {}, 50), rec(2, "build", ["empty-context"], {}, 9)]);
    const { text } = buildReport(d, NOW, SYS);
    expect(text).toContain("| build | 1 | 9 |");
    expect(text).toContain("| status | 2 | 50 |");
    expect(text).toContain("- usage-error: 1");
    expect(text).toContain("- empty-context: 1");
    expect(text).toContain("- init-ok: 0");
  });

  test("SCN-JRN-004-2 config names appear and values never do, and the last line names gh", () => {
    const d = repo();
    writeFileSync(join(d, "spec-ctx.toml"), '[bundle]\nbudget = 8123\n[cli]\nrun = "secret-prefix"\n[scan.extra]\nname = "hidden-value"\n');
    put(d, "runs.jsonl", [rec(0, "status")]);
    const { text } = buildReport(d, NOW, SYS);
    expect(text).toContain("- [bundle]: budget");
    expect(text).toContain("- [scan.extra]: name");
    for (const v of ["8123", "secret-prefix", "hidden-value"]) expect(text).not.toContain(v);
    expect(text).toContain("- spec-ctx: 9.9.9");
    expect(text).toContain("- OS: linux x64");
    expect(text.trimEnd().split("\n").pop()).toContain("gh issue create -R sonqh/spec-ctx --body-file <file>");
  });

  test("the last internal error prints name, code, and frames", () => {
    const d = repo();
    put(d, "runs.jsonl", [
      rec(0, "query", ["internal-error"], { exit: 3, err: { name: "OldError", code: null, frames: ["src/a.ts:1"] } }),
      rec(1, "query", ["internal-error"], { exit: 3, err: { name: "TypeError", code: "ERR_X", frames: ["src/main.ts:80", "/etc/passwd"] } }),
    ]);
    const { text } = buildReport(d, NOW, SYS);
    expect(text).toContain("- name: TypeError");
    expect(text).toContain("- code: ERR_X");
    expect(text).toContain("  - src/main.ts:80");
    expect(text).not.toContain("OldError");
    expect(text).not.toContain("/etc/passwd");
  });

  test("SCN-JRN-005-1 no journal gives the message", () => {
    const d = repo();
    const r = buildReport(d, NOW, SYS);
    expect(r.found).toBe(false);
    expect(r.text).toBe("no journal found under .ctx/local\n");
  });

  test("config shape handles a missing and a bad file", () => {
    const d = repo();
    expect(configShape(d)[0]).toContain("no spec-ctx.toml");
    writeFileSync(join(d, "spec-ctx.toml"), "[[[bad");
    expect(configShape(d)[0]).toContain("does not parse");
  });
});
