// Covers: REQ-VER-006, REQ-VER-007
import { describe, expect, test } from "vitest";
import { cmpTaskId, compare, formatMismatch, groupRuns, judge, type EvidenceView } from "../../src/gate/rerun.ts";
import { isWeakVerify } from "../../src/verify/parse.ts";

const ev = (o: Partial<EvidenceView> = {}): EvidenceView => ({ kind: "command", command: "bun test", exit: 0, ...o });
const v = { command: "bun test" };

describe("compare", () => {
  test("SCN-VER-006-1 manual evidence warns, and fails under strict", () => {
    const m = ev({ kind: "manual", command: null, exit: null });
    expect(compare({ command: null }, m, false, isWeakVerify)).toEqual({ act: "warn", why: "manual" });
    expect(compare({ command: null }, m, true, isWeakVerify)).toEqual({ act: "fail", kind: "manual" });
  });

  test("SCN-VER-006-2 missing evidence fails", () => {
    expect(compare(v, null, false, isWeakVerify)).toEqual({ act: "fail", kind: "no-evidence" });
  });

  test("SCN-VER-006-3 a different command or cwd is drift and runs nothing", () => {
    expect(compare({ command: "bun run x" }, ev(), false, isWeakVerify)).toMatchObject({ act: "fail", kind: "verify-drift" });
    expect(compare({ command: "bun test", cwd: "sub" }, ev(), false, isWeakVerify)).toMatchObject({ act: "fail", kind: "verify-drift" });
    expect(compare(v, ev({ cwd: "sub" }), false, isWeakVerify)).toMatchObject({ act: "fail", kind: "verify-drift" });
  });

  test("SCN-VER-006-4 a weak Verify fails under strict and runs otherwise", () => {
    const w = ev({ command: "true" });
    expect(compare({ command: "true" }, w, true, isWeakVerify)).toEqual({ act: "fail", kind: "weak-verify" });
    expect(compare({ command: "true" }, w, false, isWeakVerify)).toEqual({ act: "run", command: "true", cwd: ".", expected: 0 });
  });

  test("a clean task runs the frozen command in the evidence cwd", () => {
    expect(compare({ command: "bun test", cwd: "sub" }, ev({ cwd: "sub", exit: 0 }), true, isWeakVerify)).toEqual({ act: "run", command: "bun test", cwd: "sub", expected: 0 });
  });
});

describe("judge", () => {
  test("SCN-VER-006-5 a different exit code or a timeout is a mismatch", () => {
    expect(judge(0, { exit: 3, timedOut: false, output: "" })).toBe("mismatch");
    expect(judge(0, { exit: null, timedOut: true, output: "" })).toBe("mismatch");
  });
  test("SCN-VER-006-6 the same exit code is ok whatever the output", () => {
    expect(judge(0, { exit: 0, timedOut: false, output: "other" })).toBe("ok");
  });
});

describe("groups and report", () => {
  test("SCN-VER-007-1 equal command and cwd make one group, in the ID order of the first task", () => {
    const g = groupRuns([
      { id: "036/10.1", command: "b", cwd: "." },
      { id: "036/2.1", command: "a", cwd: "." },
      { id: "036/1.1", command: "b", cwd: "." },
      { id: "036/3.1", command: "b", cwd: "sub" },
    ]);
    expect(g.map((x) => [x.command, x.cwd, x.members.map((m) => m.id)])).toEqual([
      ["b", ".", ["036/1.1", "036/10.1"]],
      ["a", ".", ["036/2.1"]],
      ["b", "sub", ["036/3.1"]],
    ]);
  });

  test("task IDs sort by key, then by integers", () => {
    expect(["034/1.2", "036/2.10", "036/2.2", "036/10.1", "035/1.1"].sort(cmpTaskId)).toEqual(["034/1.2", "035/1.1", "036/2.2", "036/2.10", "036/10.1"]);
  });

  test("SCN-VER-007-3 the report has the five facts and the last 20 lines", () => {
    const output = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join("\n") + "\n";
    const text = formatMismatch({ id: "036/1.1", file: "openspec/changes/036-x/tasks.md", line: 7, evidence: ".ctx/evidence/036/1.1.json", expected: 0, outcome: { exit: 3, timedOut: false, output }, command: "it's", cwd: "sub", timeoutS: 600 });
    expect(text).toContain("036/1.1: mismatch\n");
    expect(text).toContain("  at openspec/changes/036-x/tasks.md:7\n");
    expect(text).toContain("  evidence .ctx/evidence/036/1.1.json\n");
    expect(text).toContain("  expected exit 0\n  actual exit 3\n");
    expect(text).toContain("    line 30\n");
    expect(text).toContain("    line 11\n");
    expect(text).not.toContain("line 10\n");
    expect(text).toContain("  reproduce: cd 'sub' && env CI=1 SPECCTX_RERUN=1 sh -c 'it'\\''s'\n");
  });

  test("SCN-VER-007-3 a cwd with a space is quoted", () => {
    const text = formatMismatch({ id: "a/1.1", file: "f", line: 1, evidence: "e", expected: 0, outcome: { exit: 3, timedOut: false, output: "" }, command: "x", cwd: "my dir/it's", timeoutS: 5 });
    expect(text).toContain("  reproduce: cd 'my dir/it'\\''s' && env CI=1 SPECCTX_RERUN=1 sh -c 'x'\n");
  });

  test("a timeout reads as a timeout", () => {
    const text = formatMismatch({ id: "a/1.1", file: "f", line: 1, evidence: "e", expected: 0, outcome: { exit: null, timedOut: true, output: "" }, command: "x", cwd: ".", timeoutS: 5 });
    expect(text).toContain("  actual timed out after 5s\n");
  });
});
