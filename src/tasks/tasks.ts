// REQ-TASK-001 REQ-TASK-002 REQ-TASK-003 REQ-TASK-005 the task state machine over tasks.md.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { UsageExit } from "../cli/errors.ts";
import { changeNum } from "../index/scan.ts";
import type { Entry } from "../index/types.ts";
import { cmpStr, cmpTuple, splitLines } from "../util/pystr.ts";
import { parseVerify, type VerifySpec } from "../verify/parse.ts";

export interface Task {
  entry: Entry;
  id: string;
  change: string;
  group: string;
  num: string;
  done: boolean;
  archived: boolean;
  reqs: string[];
  line: string;
  text: string;
  verify: VerifySpec;
}

/** Raw lines of a file with their line ends, so an edit keeps every other byte. */
function rawLines(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

/** The task text without the REQ brackets and the Verify clause. */
export function taskText(title: string): string {
  let t = title;
  const v = t.indexOf("Verify:");
  if (v >= 0) t = t.slice(0, v);
  return t.replace(/\[REQ-[A-Z]{2,6}-\d{3}(?:\s*,\s*REQ-[A-Z]{2,6}-\d{3})*\]/g, "").replace(/\s+/g, " ").trim();
}

export function toTask(root: string, e: Entry): Task {
  const lines = splitLines(readFileSync(join(root, e.file)).toString("utf8"));
  const line = lines[e.line - 1] ?? e.title;
  const num = e.id.slice(e.id.indexOf("/") + 1);
  return {
    entry: e,
    id: e.id,
    change: e.change,
    group: num.split(".")[0]!,
    num,
    done: e.status === "done",
    archived: e.file.includes("/archive/"),
    reqs: [...e.refs],
    line,
    text: taskText(e.title),
    verify: parseVerify(line),
  };
}

export function tasksOf(entries: Entry[]): Entry[] {
  return entries.filter((e) => e.kind === "task");
}

export function findTask(root: string, entries: Entry[], id: string): Task {
  const hits = tasksOf(entries).filter((e) => e.id === id);
  if (hits.length === 0) throw new UsageExit(`no task ${id}`);
  // an active copy wins over an archived one with the same number
  hits.sort((a, b) => Number(a.file.includes("/archive/")) - Number(b.file.includes("/archive/")));
  return toTask(root, hits[0]!);
}

export function activeChanges(entries: Entry[]): string[] {
  const s = new Set<string>();
  for (const e of tasksOf(entries)) if (!e.file.includes("/archive/") && e.change !== "main") s.add(e.change);
  return [...s].sort(cmpStr);
}

/** The first open task whose earlier tasks in the same group are done, in the lowest numbered active change. */
export function nextTask(root: string, entries: Entry[], change?: string): Task | null {
  const changes = activeChanges(entries).filter((c) => !change || c === change || changeNum(c) === change);
  for (const c of changes) {
    const ts = tasksOf(entries)
      .filter((e) => e.change === c && !e.file.includes("/archive/"))
      .sort((a, b) => cmpTuple([a.file, a.line], [b.file, b.line]));
    for (const e of ts) {
      if (e.status !== "open") continue;
      const group = e.id.slice(e.id.indexOf("/") + 1).split(".")[0];
      const earlier = ts.filter((x) => x.line < e.line && x.file === e.file && x.id.slice(x.id.indexOf("/") + 1).split(".")[0] === group);
      if (earlier.every((x) => x.status === "done")) return toTask(root, e);
    }
  }
  return null;
}

/** Flip only the box characters on the task line. Every other byte of tasks.md stays. */
export function setBox(root: string, t: Task, done: boolean): void {
  const p = join(root, t.entry.file);
  const raw = rawLines(readFileSync(p).toString("utf8"));
  const i = t.entry.line - 1;
  const line = raw[i];
  if (line === undefined) throw new Error(`line ${t.entry.line} of ${t.entry.file} is missing`);
  const m = /^(\s*- )\[([ xX]?)\]/.exec(line);
  if (!m) throw new Error(`${t.entry.file}:${t.entry.line} is not a task line`);
  const box = done ? "[x]" : "[ ]";
  raw[i] = m[1] + box + line.slice(m[0].length);
  writeFileSync(p, raw.join(""));
  invalidateIndex(root);
}

/**
 * REQ-IDX-004 a write by specctx itself drops the index, so the next command rebuilds it
 * even when the edit lands in the same millisecond as the last build.
 */
export function invalidateIndex(root: string): void {
  rmSync(join(root, ".ctx/index.json"), { force: true });
}

export function evidenceRel(t: { id: string }): string {
  const [num, task] = t.id.split("/");
  return `.ctx/evidence/${num}/${task}.json`;
}

export function hasEvidence(root: string, t: { id: string }): boolean {
  return existsSync(join(root, evidenceRel(t)));
}
