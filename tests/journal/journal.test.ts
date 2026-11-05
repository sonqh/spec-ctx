// Covers: REQ-JRN-001, REQ-JRN-002, REQ-JRN-003
import { afterEach, describe, expect, test } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendRun, journalLine } from "../../src/journal/journal.ts";
import { errInfo, note, type JournalSink } from "../../src/journal/note.ts";
import { provenance, parseProvenance } from "../../src/graph/bundle.ts";
import { contextSignals } from "../../src/journal/signals.ts";
import type { Entry } from "../../src/index/types.ts";

const dirs: string[] = [];
function repo(withOpenspec = true): string {
  const d = mkdtempSync(join(tmpdir(), "specctx-jrn-"));
  dirs.push(d);
  if (withOpenspec) mkdirSync(join(d, "openspec"));
  return d;
}
afterEach(() => {
  delete process.env.SPECCTX_JOURNAL;
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
const sink = (root: string | undefined, extra: Partial<JournalSink> = {}): JournalSink => ({ root, signals: new Set(), ...extra });
const RUN = { exit: 0, ms: 12.4, version: "9.9.9", at: "2026-11-05T10:00:00.000Z" };

describe("journal line", () => {
  test("SCN-JRN-001-1 sorted keys, known cmd, no extra fields", () => {
    const line = journalLine(sink("/x", { cmd: "status" }), RUN);
    expect(line).toBe('{"at":"2026-11-05T10:00:00.000Z","cmd":"status","exit":0,"ms":12,"signals":[],"v":1,"version":"9.9.9"}');
    expect(Object.keys(JSON.parse(line))).toEqual(["at", "cmd", "exit", "ms", "signals", "v", "version"]);
  });

  test("an unknown or missing cmd is ?", () => {
    expect(JSON.parse(journalLine(sink("/x", { cmd: "frobnicate --token=abc" }), RUN)).cmd).toBe("?");
    expect(JSON.parse(journalLine(sink("/x"), RUN)).cmd).toBe("?");
    expect(JSON.parse(journalLine(sink("/x", { cmd: "task" }), RUN)).cmd).toBe("?");
  });

  test("SCN-JRN-002-2 exit 2 gives usage-error and exit 3 gives internal-error with err", () => {
    const e = { name: "TypeError", code: null, frames: ["src/a.ts:1"] };
    expect(JSON.parse(journalLine(sink("/x", { cmd: "?" }), { ...RUN, exit: 2 })).signals).toEqual(["usage-error"]);
    const r = JSON.parse(journalLine(sink("/x", { cmd: "query", err: e }), { ...RUN, exit: 3 }));
    expect(r.signals).toEqual(["internal-error"]);
    expect(r.err).toEqual(e);
    // an err with exit 0 is dropped
    expect(JSON.parse(journalLine(sink("/x", { cmd: "query", err: e }), RUN)).err).toBeUndefined();
  });

  test("note keeps only signals of the closed set", () => {
    const s = sink("/x");
    note({ journal: s }, { signal: "init-ok" });
    note({ journal: s }, { signal: "made-up" as never });
    expect([...s.signals]).toEqual(["init-ok"]);
    expect(() => note({}, { cmd: "x" })).not.toThrow();
  });

  test("the line stays under 4 KB with a huge err", () => {
    const frames = Array.from({ length: 400 }, (_, i) => `src/${"x".repeat(60)}${i}.ts:${i}`);
    const line = journalLine(sink("/x", { cmd: "query", err: { name: "E", code: null, frames } }), { ...RUN, exit: 3 });
    expect(line.length).toBeLessThan(4096);
    expect(JSON.parse(line).signals).toContain("internal-error");
  });
});

describe("append", () => {
  test("SCN-JRN-003-1 writes the line and a .gitignore of *", () => {
    const d = repo();
    appendRun(sink(d, { cmd: "build" }), RUN);
    appendRun(sink(d, { cmd: "build" }), RUN);
    const lines = readFileSync(join(d, ".ctx/local/runs.jsonl"), "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(readFileSync(join(d, ".ctx/local/.gitignore"), "utf8")).toBe("*\n");
  });

  test("SCN-JRN-001-2 no openspec folder and no root write nothing", () => {
    const d = repo(false);
    appendRun(sink(d, { cmd: "build" }), RUN);
    appendRun(sink(undefined, { cmd: "build" }), RUN);
    expect(existsSync(join(d, ".ctx"))).toBe(false);
  });

  test("SCN-JRN-003-1 a file over 256 KB rotates", () => {
    const d = repo();
    mkdirSync(join(d, ".ctx/local"), { recursive: true });
    writeFileSync(join(d, ".ctx/local/runs.jsonl"), "x".repeat(256 * 1024 + 1));
    appendRun(sink(d, { cmd: "build" }), RUN);
    expect(statSync(join(d, ".ctx/local/runs.1.jsonl")).size).toBe(256 * 1024 + 1);
    expect(readFileSync(join(d, ".ctx/local/runs.jsonl"), "utf8").trim().split("\n")).toHaveLength(1);
  });

  test("SCN-JRN-003-2 the switch 0 writes nothing, and only 0 switches it off", () => {
    const d = repo();
    process.env.SPECCTX_JOURNAL = "0";
    appendRun(sink(d, { cmd: "build" }), RUN);
    expect(existsSync(join(d, ".ctx"))).toBe(false);
    process.env.SPECCTX_JOURNAL = "1";
    appendRun(sink(d, { cmd: "build" }), RUN);
    expect(existsSync(join(d, ".ctx/local/runs.jsonl"))).toBe(true);
  });

  test("SCN-JRN-003-2 a failure stays silent", () => {
    const d = repo();
    mkdirSync(join(d, ".ctx"));
    writeFileSync(join(d, ".ctx/local"), "plain file");
    expect(() => appendRun(sink(d, { cmd: "build" }), RUN)).not.toThrow();
  });
});

describe("err frames", () => {
  test("SCN-JRN-002-3 frames come from the package only, with no message and no column", () => {
    const e = new Error("secret message /home/me/x.ts:9:9");
    e.stack = [
      "Error: secret message /home/me/x.ts:9:9",
      "    at f (file:///pkg/src/main.ts:80:5)",
      "    at g (/pkg/dist/cli/commands.js:12:3)",
      "    at h (/pkg/node_modules/dep/index.js:1:1)",
      "    at i (/elsewhere/x.js:1:1)",
      "    at node:internal/modules/run_main:1:1",
      "    at /pkg/src/util/a.ts:7:2",
    ].join("\n");
    (e as { code?: string }).code = "ERR_X";
    expect(errInfo(e, "/pkg")).toEqual({ name: "Error", code: "ERR_X", frames: ["src/main.ts:80", "dist/cli/commands.js:12", "src/util/a.ts:7"] });
  });

  test("a message line with a frame look is skipped and a bad code is null", () => {
    const e = new Error("x");
    e.stack = "Error: x\n    at /pkg/src/a.ts:1:1";
    (e as { code?: string }).code = "not a code";
    expect(errInfo(e, "/pkg").code).toBeNull();
    expect(errInfo("text").name).toBe("NonError");
    // a real error from this package has frames under src or dist
    const real = errInfo(new Error("m"));
    expect(real.frames.every((f) => /^(src|dist|tests)\//.test(f) || !f.startsWith("/"))).toBe(true);
    expect(JSON.stringify(real)).not.toContain("m\"");
  });
});

describe("provenance", () => {
  const e = (id: string, kind: Entry["kind"]): Entry => ({ id, kind, file: "f.ts", line: 1, title: "", text: "", status: "active", refs: [], canonical: true } as unknown as Entry);

  test("parseProvenance reads what provenance writes", () => {
    const line = provenance(e("REQ-A-001", "req"), "requested");
    expect(parseProvenance(line.trimEnd())).toBe("REQ-A-001");
    expect(parseProvenance("- [ ] 1.1 -- not a line")).toBeNull();
    expect(parseProvenance("  -- X | y")).toBeNull();
  });

  test("SCN-JRN-002-1 contextSignals", () => {
    const entries = [e("REQ-A-001", "req"), e("src/a.ts:3", "code")];
    const withCode = provenance(entries[0]!, "requested") + provenance(entries[1]!, "implements REQ-A-001");
    expect(contextSignals(entries, { text: withCode, complete: true })).toEqual(["context-has-code-or-test"]);
    expect(contextSignals(entries, { text: provenance(entries[0]!, "requested"), complete: true })).toEqual([]);
    expect(contextSignals(entries, { text: "no links: x\n", complete: true })).toEqual(["empty-context"]);
    expect(contextSignals(entries, { text: withCode, complete: false })).toEqual(["context-has-code-or-test", "truncated-context"]);
  });
});
