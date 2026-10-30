// REQ-HND-001 REQ-HND-002 the generated session handoff in .ctx/handoff.md.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { UsageExit } from "../cli/errors.ts";
import { changeKey, matchesChange } from "../index/scan.ts";
import { activeFolders } from "../loop/next.ts";
import type { Entry } from "../index/types.ts";
import { listEvidence } from "../tasks/evidence.ts";
import { activeChanges, nextTask } from "../tasks/tasks.ts";
import { cmpStr, splitLines } from "../util/pystr.ts";
import { isoNow } from "../util/time.ts";
import { addQuestion, type QuestionStage, fromHandoffItems, hasQuestions, readQuestions, renderQuestions, resolveQuestion, writeQuestions } from "./questions.ts";

export const HANDOFF_PATH = ".ctx/handoff.md";
export const CURRENT_PATH = ".ctx/current.json";

const SCALARS = ["change", "current", "base", "as_of"] as const;
const LISTS = ["done", "reopened", "open_questions", "resolved"] as const;

export interface Handoff {
  change: string;
  current: string;
  base: string;
  as_of: string;
  done: string[];
  reopened: string[];
  open_questions: string[];
  resolved: string[];
  next: string;
  evidence: string;
  /** REQ-HND-002 the n of the question that `ask` added (022/D9). Not rendered. */
  asked?: number;
  /** REQ-HND-002 the count of questions that `write` moved into questions.json (022/D8). Not rendered. */
  migrated?: number;
}

function empty(): Handoff {
  return { change: "none", current: "none", base: "none", as_of: "none", done: [], reopened: [], open_questions: [], resolved: [], next: "", evidence: "" };
}

/** Parse a handoff file. A list item keeps its indented continuation lines. */
export function parseHandoff(text: string): Handoff {
  const h = empty();
  let list: string[] | null = null;
  for (const line of splitLines(text)) {
    if (list && line.startsWith("- ")) {
      list.push(line.slice(2));
      continue;
    }
    if (list && /^[ \t]/.test(line) && line.trim() && list.length) {
      list[list.length - 1] += "\n" + line;
      continue;
    }
    list = null;
    const m = /^([a-z_]+):(?: (.*))?$/.exec(line);
    if (!m) continue;
    const key = m[1]!;
    if ((LISTS as readonly string[]).includes(key)) list = h[key as (typeof LISTS)[number]];
    else if ((SCALARS as readonly string[]).includes(key) || key === "next" || key === "evidence") {
      (h as unknown as Record<string, string>)[key] = (m[2] ?? "").trim();
    }
  }
  return h;
}

export function renderHandoff(h: Handoff): string {
  const out = ["# Handoff"];
  for (const k of SCALARS) out.push(`${k}: ${h[k]}`);
  for (const k of LISTS) {
    out.push(`${k}:`);
    for (const item of h[k]) out.push(`- ${item}`);
  }
  out.push(`next: ${h.next}`, `evidence: ${h.evidence}`);
  return out.join("\n") + "\n";
}

export function readHandoff(root: string): Handoff | null {
  const p = join(root, HANDOFF_PATH);
  return existsSync(p) ? parseHandoff(readFileSync(p).toString("utf8")) : null;
}

function save(root: string, h: Handoff): void {
  mkdirSync(join(root, ".ctx"), { recursive: true });
  writeFileSync(join(root, HANDOFF_PATH), renderHandoff(h));
}

export function currentTask(root: string): string {
  try {
    const c = JSON.parse(readFileSync(join(root, CURRENT_PATH), "utf8")) as { task?: string };
    return c.task ?? "none";
  } catch {
    return "none";
  }
}

interface EvidenceRow {
  task: string;
  at: string;
  kind: string;
}

function evidenceRows(root: string, active: string[]): EvidenceRow[] {
  // REQ-IDX-005 evidence files name the change by its key
  const nums = new Set(active.map(changeKey));
  const rows: EvidenceRow[] = [];
  for (const rel of listEvidence(root)) {
    try {
      const ev = JSON.parse(readFileSync(join(root, rel), "utf8")) as EvidenceRow;
      if (typeof ev.task === "string" && nums.has(ev.task.split("/")[0]!)) rows.push({ task: ev.task, at: String(ev.at), kind: String(ev.kind) });
    } catch {
      // a damaged evidence file is a check finding, not a handoff error
    }
  }
  return rows;
}

const AT = / \(at (\S+)\)$/;

/**
 * REQ-HND-002 move the questions of an old handoff.md into questions.json once (022/D8).
 * Returns the count, 0 when the file exists or the handoff has no question.
 */
function migrateQuestions(root: string, prev: Handoff | null): number {
  if (!prev || hasQuestions(root)) return 0;
  if (!prev.open_questions.length && !prev.resolved.length) return 0;
  const qs = fromHandoffItems(prev.open_questions, prev.resolved);
  writeQuestions(root, qs);
  return qs.length;
}

/** Generate the handoff. Two runs with no change in between write the same bytes. */
export function writeHandoff(root: string, entries: Entry[]): Handoff {
  const prev = readHandoff(root);
  const migrated = migrateQuestions(root, prev);
  const lists = renderQuestions(readQuestions(root));
  const active = activeChanges(entries);
  const next = nextTask(root, entries);
  const rows = evidenceRows(root, active);
  const asOf = rows.length ? rows.map((r) => r.at).sort(cmpStr).pop()! : "none";
  // the done window starts where the previous handoff ended, unless no new evidence came since
  let base = "none";
  if (prev) base = prev.as_of === asOf ? prev.base : prev.as_of;
  const after = (at: string): boolean => base === "none" || cmpStr(at, base) > 0;
  const h: Handoff = {
    change: next ? next.change : active[0] ?? "none",
    current: currentTask(root),
    base,
    as_of: asOf,
    done: rows.filter((r) => after(r.at)).map((r) => r.task).sort(cmpStr),
    reopened: (prev?.reopened ?? []).filter((item) => {
      const m = AT.exec(item.split("\n")[0]!);
      return !m || after(m[1]!);
    }),
    // REQ-HND-001 both lists come from questions.json, never from the previous file (022/D7)
    open_questions: lists.open_questions,
    resolved: lists.resolved,
    next: next ? `${next.id}  ${next.text}` : "no open task",
    evidence: `${rows.length} task(s), ${rows.filter((r) => r.kind === "command").length} command, ${rows.filter((r) => r.kind === "manual").length} manual`,
  };
  save(root, h);
  if (migrated) h.migrated = migrated;
  return h;
}

/** The handoff with its two question lists rendered again from questions.json. The other sections stay. */
function refresh(root: string, entries: Entry[]): Handoff {
  const h = readHandoff(root) ?? writeHandoff(root, entries);
  const lists = renderQuestions(readQuestions(root));
  h.open_questions = lists.open_questions;
  h.resolved = lists.resolved;
  save(root, h);
  return h;
}

/**
 * REQ-HND-002 append an open question to questions.json and render the handoff again (022/D6).
 * REQ-LOOP-005 with a change, the question carries the active change folder, so next blocks the change (029/D1).
 */
export function ask(root: string, entries: Entry[], text: string, change?: string): Handoff {
  let task = currentTask(root);
  let stage: QuestionStage | undefined;
  if (change !== undefined) {
    const folder = activeFolders(root).find((f) => matchesChange(f, change));
    if (folder === undefined) throw new UsageExit(`no active change ${change}`);
    task = folder;
    stage = stageOf(entries, folder);
  }
  const q = addQuestion(root, task, text, stage);
  const h = refresh(root, entries);
  h.asked = q.n;
  return h;
}

/** REQ-LOOP-007 archive when the change has a task and every task is [x], plan otherwise. The text plays no part (031/D1). */
export function stageOf(entries: Entry[], folder: string): QuestionStage {
  const tasks = entries.filter((e) => e.kind === "task" && e.change === folder && !e.file.includes("/archive/"));
  return tasks.length > 0 && tasks.every((t) => t.status === "done") ? "archive" : "plan";
}

/** REQ-HND-002 resolve question n in questions.json and render the handoff again (022/D6). */
export function resolve(root: string, entries: Entry[], n: number, answer: string): Handoff {
  resolveQuestion(root, n, answer);
  return refresh(root, entries);
}

export function addReopened(root: string, entries: Entry[], task: string, reason: string): void {
  const h = readHandoff(root) ?? writeHandoff(root, entries);
  h.reopened.push(`${task} ${reason.replace(/\s*\n\s*/g, " ").trim()} (at ${isoNow()})`);
  save(root, h);
}
