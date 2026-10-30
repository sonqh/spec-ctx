// REQ-LOOP-002 fail files under .ctx/evidence/<change>/<task>.fail-<n>.json and the attempt window (024/D4, 024/D5).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readQuestions, type Question } from "../handoff/questions.ts";
import { isFailFile } from "../tasks/evidence.ts";
import { evidenceRel } from "../tasks/tasks.ts";
import { dumps } from "../util/json.ts";
import { cmpStr } from "../util/pystr.ts";
import { isoNow } from "../util/time.ts";

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
 * The start of the attempt window of a task: `current.json.started_at` when the file names the task, else the
 * start of time. A resolved question for the task moves the start to its `resolved_at`, so a resolve resets the count.
 */
export function windowStart(root: string, task: string, questions?: Question[]): string {
  let start = "";
  try {
    const cur = JSON.parse(readFileSync(join(root, ".ctx/current.json"), "utf8")) as { task?: string; started_at?: unknown };
    if (cur.task === task && typeof cur.started_at === "string") start = cur.started_at;
  } catch {
    // no current task
  }
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

/** The fail files of a task inside its window, in `at` order. */
export function failsInWindow(root: string, task: string, questions?: Question[]): { rel: string; file: FailFile }[] {
  const start = windowStart(root, task, questions);
  return readFails(root, task).filter((f) => cmpStr(f.file.at, start) >= 0);
}

/** The open question that names the task, if any. */
export function openQuestionFor(root: string, task: string, questions?: Question[]): Question | undefined {
  return (questions ?? safeQuestions(root)).find((q) => q.task === task && q.status === "open");
}

/** Write the next fail file of a task. The attempt counts the window, the file number counts every fail file. */
export function writeFail(root: string, task: string, verify: FailFile["verify"], tail: string): { rel: string; file: FailFile } {
  const attempt = failsInWindow(root, task).length + 1;
  const rel = evidenceRel({ id: task });
  const base = rel.slice(0, -".json".length);
  let n = 1;
  while (existsSync(join(root, `${base}.fail-${n}.json`))) n++;
  const target = `${base}.fail-${n}.json`;
  const file: FailFile = { at: isoNow(), attempt, stderr_tail: tail, task, verify };
  mkdirSync(dirname(join(root, target)), { recursive: true });
  writeFileSync(join(root, target), dumps(file) + "\n");
  return { rel: target, file };
}

/** REQ-LOOP-002 the question text at the cap. It quotes the failing line (033/D2). Strict mode. */
export function capQuestion(task: string, attempts: number, tail: string): string {
  return `task ${task} failed Verify ${attempts} times. Last: ${failLine(tail)}. What should change?`;
}

/** REQ-LOOP-002 the last line of a failed `task done` at the cap. Strict mode. */
export function blockedLine(n: number): string {
  return `blocked: question ${n} written. Run specctx handoff resolve ${n} "<answer>" to continue.`;
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
