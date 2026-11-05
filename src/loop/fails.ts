// REQ-LOOP-002 REQ-LOOP-017 REQ-LOOP-018 fail files under .ctx/evidence/<change>/<task>.fail-<n>.json and the attempt window (024/D4, 024/D5).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readQuestions, type Question } from "../handoff/questions.ts";
import { isFailFile } from "../tasks/evidence.ts";
import { evidenceRel } from "../tasks/tasks.ts";
import { runCommand } from "../runcmd.ts";
import { dumps } from "../util/json.ts";
import { cmpStr } from "../util/pystr.ts";
import { isoNow } from "../util/time.ts";

const CURRENT = ".ctx/current.json";

export interface FailFile {
  at: string;
  attempt: number;
  stderr_tail: string;
  task: string;
  verify: { command: string; exit: number | null };
}

/** Every fail file of a task, parsed, in `at` order. A damaged file is skipped. */
export function readFails(root: string, task: string): { rel: string; file: FailFile }[] {
  const rel = evidenceRel({ id: task });
  const dir = dirname(join(root, rel));
  const base = rel.slice(rel.lastIndexOf("/") + 1, -".json".length);
  if (!existsSync(dir)) return [];
  const out: { rel: string; file: FailFile }[] = [];
  for (const n of readdirSync(dir)) {
    if (!n.startsWith(`${base}.fail-`) || !isFailFile(n)) continue;
    try {
      const file = JSON.parse(readFileSync(join(dir, n), "utf8")) as FailFile;
      if (file.task === task && typeof file.at === "string") out.push({ rel: `${dirname(rel)}/${n}`, file });
    } catch {
      // a damaged fail file counts for nothing
    }
  }
  return out.sort((a, b) => cmpStr(a.file.at, b.file.at) || cmpStr(a.rel, b.rel));
}

/**
 * REQ-LOOP-018 the start of the attempt window of a task: `current.json.started_at` when the file names the task, else
 * null, and no fail file counts (056/D4). A resolved question for the task moves the start to its `resolved_at`, so a
 * resolve resets the count. `fallback` gives the start of time instead of null, for a current.json that could not be written.
 */
export function windowStart(root: string, task: string, questions?: Question[], fallback = false): string | null {
  let start: string | null = fallback ? "" : null;
  try {
    const cur = JSON.parse(readFileSync(join(root, CURRENT), "utf8")) as { task?: string; started_at?: unknown };
    if (cur.task === task && typeof cur.started_at === "string") start = cur.started_at;
  } catch {
    // no current task
  }
  if (start === null) return null;
  for (const q of questions ?? safeQuestions(root)) {
    if (q.task === task && q.status === "resolved" && typeof q.resolved_at === "string" && cmpStr(q.resolved_at, start) > 0) start = q.resolved_at;
  }
  return start;
}

function safeQuestions(root: string): Question[] {
  try {
    return readQuestions(root);
  } catch {
    return [];
  }
}

/** REQ-LOOP-018 the fail files of a task inside its window, in `at` order. None without a window. */
export function failsInWindow(root: string, task: string, questions?: Question[], fallback = false): { rel: string; file: FailFile }[] {
  const start = windowStart(root, task, questions, fallback);
  if (start === null) return [];
  return readFails(root, task).filter((f) => cmpStr(f.file.at, start) >= 0);
}

/** The open question that names the task, if any. */
export function openQuestionFor(root: string, task: string, questions?: Question[]): Question | undefined {
  return (questions ?? safeQuestions(root)).find((q) => q.task === task && q.status === "open");
}

/**
 * REQ-LOOP-014 an open attempt-cap question of the task: stage cap only. A question with no stage is a person's (044/D3).
 * The text plays no part (044/D3).
 */
export function isCapQuestion(q: Question, task: string): boolean {
  return q.status === "open" && q.task === task && q.stage === "cap";
}

/**
 * REQ-LOOP-018 a failed run with no current.json for the task opens its window first (056/D4). The file has only
 * `started_at` and `task`: no `verify`, so a later Verify edit is not refused, and no `bundle_chars`, so stats keeps
 * cycle time for runs that began with task start. Returns false when the write fails.
 */
export function openWindow(root: string, task: string): boolean {
  try {
    const cur = JSON.parse(readFileSync(join(root, CURRENT), "utf8")) as { task?: string; started_at?: unknown };
    if (cur.task === task && typeof cur.started_at === "string") return true;
  } catch {
    // absent or damaged: write a new one
  }
  try {
    mkdirSync(join(root, ".ctx"), { recursive: true });
    writeFileSync(join(root, CURRENT), dumps({ started_at: isoNow(), task }) + "\n");
    return true;
  } catch {
    return false;
  }
}

/** REQ-LOOP-017 the line that keeps fail files out of git, in `.ctx/evidence/.gitignore` (056/D1). */
export const FAIL_IGNORE = "*.fail-*.json";

/**
 * REQ-LOOP-017 make sure `.ctx/evidence/.gitignore` has the fail file line. Create the file or append the line. Other
 * lines keep their bytes and order. A write error changes nothing (056/D1).
 */
export function ensureFailIgnore(root: string): void {
  const p = join(root, ".ctx/evidence/.gitignore");
  try {
    const cur = existsSync(p) ? readFileSync(p, "utf8") : "";
    if (cur.split(/\r?\n/).some((l) => l.trim() === FAIL_IGNORE)) return;
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, (cur === "" || cur.endsWith("\n") ? cur : cur + "\n") + FAIL_IGNORE + "\n");
  } catch {
    // a read-only tree keeps its fail files tracked
  }
}

/** Write the next fail file of a task. The attempt counts the window, the file number counts every fail file. */
export function writeFail(root: string, task: string, verify: FailFile["verify"], tail: string): { rel: string; file: FailFile } {
  // REQ-LOOP-018 when current.json cannot be written, count as before (056/D4)
  const opened = openWindow(root, task);
  const attempt = failsInWindow(root, task, undefined, !opened).length + 1;
  const rel = evidenceRel({ id: task });
  const base = rel.slice(0, -".json".length);
  let n = 1;
  while (existsSync(join(root, `${base}.fail-${n}.json`))) n++;
  const target = `${base}.fail-${n}.json`;
  const file: FailFile = { at: isoNow(), attempt, stderr_tail: tail, task, verify };
  mkdirSync(dirname(join(root, target)), { recursive: true });
  writeFileSync(join(root, target), dumps(file) + "\n");
  ensureFailIgnore(root);
  return { rel: target, file };
}

/** REQ-LOOP-002 the question text at the cap. It quotes the failing line (033/D2). Strict mode. */
export function capQuestion(task: string, attempts: number, tail: string): string {
  return `task ${task} failed Verify ${attempts} times. Last: ${failLine(tail)}. What should change?`;
}

/** REQ-LOOP-002 the last line of a failed `task done` at the cap. Strict mode. */
export function blockedLine(n: number, run = "specctx"): string {
  return `blocked: question ${n} written. Run ${runCommand(run, `handoff resolve ${n} "<answer>"`)} to continue.`;
}

/**
 * REQ-LOOP-006 the reason line of a Verify tail (029/D3): the last line that starts with `fail:`, `FAIL`, or `(fail)`
 * after trimming (039/D1), else the last non-empty line, else `no output`. The match is case sensitive.
 */
export function failLine(tail: string): string {
  const lines = tail.split("\n").map((l) => l.trimEnd());
  const hit = lines.filter((l) => /^\s*(?:fail:|FAIL|\(fail\))/.test(l)).at(-1);
  if (hit !== undefined) return hit.trim();
  return lines.filter((l) => l.trim()).at(-1)?.trim() ?? "no output";
}
