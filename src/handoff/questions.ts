// REQ-HND-002 the open and resolved questions in .ctx/questions.json (022/D6, ADR-006 item 1).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { UsageExit } from "../cli/errors.ts";
import { isoNow } from "../util/time.ts";

export const QUESTIONS_PATH = ".ctx/questions.json";

export interface Question {
  n: number;
  asked_at: string;
  task: string;
  text: string;
  status: "open" | "resolved";
  answer?: string;
  resolved_at?: string;
  /** REQ-LOOP-007 the stage of the change when handoff ask --change ran: plan or archive (031/D1). */
  stage?: QuestionStage;
}

export type QuestionStage = "plan" | "archive";

/** The questions sorted by n. An absent file is an empty list. A damaged file is a usage error, not a crash. */
export function readQuestions(root: string): Question[] {
  const p = join(root, QUESTIONS_PATH);
  if (!existsSync(p)) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(p, "utf8"));
  } catch {
    throw new UsageExit(`${QUESTIONS_PATH} is not valid JSON`);
  }
  if (!Array.isArray(raw)) throw new UsageExit(`${QUESTIONS_PATH} must hold a JSON list`);
  return (raw as Question[]).slice().sort((a, b) => a.n - b.n);
}

export function hasQuestions(root: string): boolean {
  return existsSync(join(root, QUESTIONS_PATH));
}

export function writeQuestions(root: string, qs: Question[]): void {
  mkdirSync(join(root, ".ctx"), { recursive: true });
  const sorted = qs.slice().sort((a, b) => a.n - b.n);
  writeFileSync(join(root, QUESTIONS_PATH), JSON.stringify(sorted, null, 2) + "\n");
}

/** One line of text. A question or an answer never spans lines in the file. */
export function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim();
}

/** REQ-HND-002 append an open question with the next n. Returns the new question. */
export function addQuestion(root: string, task: string, text: string, stage?: QuestionStage): Question {
  const q = oneLine(text);
  if (!q) throw new UsageExit("handoff ask needs a question");
  const qs = readQuestions(root);
  const n = qs.reduce((m, x) => Math.max(m, x.n), 0) + 1;
  const item: Question = { n, asked_at: isoNow(), task, text: q, status: "open" };
  if (stage !== undefined) item.stage = stage;
  qs.push(item);
  writeQuestions(root, qs);
  return item;
}

/** REQ-HND-002 resolve the open question n with an answer. Exit 2 when n is not an open question. */
export function resolveQuestion(root: string, n: number, answer: string): Question {
  const qs = readQuestions(root);
  const item = qs.find((x) => x.n === n && x.status === "open");
  if (!Number.isInteger(n) || !item) {
    const open = qs.filter((x) => x.status === "open").length;
    throw new UsageExit(`no open question ${n}. The file has ${open} open question(s)`);
  }
  const a = oneLine(answer);
  if (!a) throw new UsageExit("handoff resolve needs an answer");
  item.status = "resolved";
  item.answer = a;
  item.resolved_at = isoNow();
  writeQuestions(root, qs);
  return item;
}

const ITEM = /^(.*) \(task (\S+), (\d{4}-\d{2}-\d{2})\)(?: answer: (.*))?$/s;

/**
 * REQ-HND-002 the questions of an old handoff.md as objects (022/D8). Resolved items come first, then open ones,
 * with n from 1 in that order. An item that does not match the old pattern keeps its whole text and task none.
 */
export function fromHandoffItems(open: string[], resolved: string[]): Question[] {
  const out: Question[] = [];
  const push = (item: string, status: Question["status"]): void => {
    const m = ITEM.exec(item);
    const q: Question = m
      ? { n: out.length + 1, asked_at: m[3]!, task: m[2]!, text: oneLine(m[1]!), status }
      : { n: out.length + 1, asked_at: "none", task: "none", text: oneLine(item), status };
    if (status === "resolved") q.answer = m?.[4] !== undefined ? oneLine(m[4]) : "";
    out.push(q);
  };
  for (const item of resolved) push(item, "resolved");
  for (const item of open) push(item, "open");
  return out;
}

/** The last 10 resolved entries render. The rest stay in the file. */
export const RESOLVED_SHOWN = 10;

/** REQ-HND-001 the two lists of handoff.md as rendered item text (022/D7). */
export function renderQuestions(qs: Question[]): { open_questions: string[]; resolved: string[] } {
  const date = (q: Question): string => q.asked_at.slice(0, 10);
  const head = (q: Question): string => `Q${q.n} ${q.text} (task ${q.task}, ${date(q)})`;
  const open = qs.filter((q) => q.status === "open").map(head);
  const done = qs.filter((q) => q.status === "resolved");
  const shown = done.slice(-RESOLVED_SHOWN).map((q) => `${head(q)} answer: ${q.answer ?? ""}`);
  const more = done.length - Math.min(done.length, RESOLVED_SHOWN);
  if (more > 0) shown.push(`and ${more} more in ${QUESTIONS_PATH}`);
  return { open_questions: open, resolved: shown };
}
