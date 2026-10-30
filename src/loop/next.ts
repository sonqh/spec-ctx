// REQ-LOOP-001 specctx next: the next action from the files on disk, with a closed enum (024/D1, 024/D2, ADR-006 item 2).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { applyBaseline } from "../baseline/baseline.ts";
import { check } from "../check/check.ts";
import { staleOf } from "../check/evidence.ts";
import type { Config } from "../config.ts";
import { readQuestions, type Question } from "../handoff/questions.ts";
import { changeKey, matchesChange } from "../index/scan.ts";
import type { Entry, Index } from "../index/types.ts";
import { listEvidence } from "../tasks/evidence.ts";
import { hasEvidence, nextTask, tasksOf } from "../tasks/tasks.ts";
import { cmpStr, cmpTuple } from "../util/pystr.ts";
import { capQuestion, failLine, failsInWindow, openQuestionFor } from "./fails.ts";
import { openspecCommand, openspecStatus } from "./openspec.ts";

/** The closed action list. A skill stops on any value outside it. */
export const ACTIONS = ["plan", "cite", "start", "work", "fix", "repair", "gate", "archive", "ask", "stop"] as const;
export type Action = (typeof ACTIONS)[number];

/** The keys of the object, sorted. Every state prints all of them. */
export const KEYS = ["action", "attempt", "change", "command", "human", "max_attempts", "reason", "state", "task", "tasks"] as const;

export interface Decision {
  action: Action;
  attempt: number;
  change: string | null;
  command: string | null;
  human: boolean;
  max_attempts: number;
  reason: string | null;
  state: string;
  task: string | null;
  /** REQ-LOOP-001 every task the action names. `task` is the first one (033/D1). */
  tasks: string[];
}

/** The rules of check whose finding means a task or a header lacks its citation (024/D2 step 4). */
// REQ-LOOP-004 a weak Verify command is a citation gap too (028/D7)
const CITE_RULES = new Set(["missing-id", "task-without-req", "task-without-verify", "unknown-task-req", "weak-verify"]);
const TASK_RULES = new Set(["task-without-req", "task-without-verify", "unknown-task-req", "weak-verify"]);

/** The active change folders under openspec/changes/, sorted. The file system decides, so a change with no tasks.md counts. */
export function activeFolders(root: string): string[] {
  const dir = join(root, "openspec", "changes");
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const n of readdirSync(dir)) {
    if (n === "archive" || n.startsWith(".")) continue;
    try {
      if (statSync(join(dir, n)).isDirectory()) out.push(n);
    } catch {
      // a vanished entry is not a change
    }
  }
  return out.sort(cmpStr);
}

function questions(root: string): Question[] {
  try {
    return readQuestions(root);
  } catch {
    return [];
  }
}

/** The last line of the gate log, or null. */
function lastGate(root: string): { at: string; ok: boolean } | null {
  const p = join(root, ".ctx/gate-log.jsonl");
  if (!existsSync(p)) return null;
  const lines = readFileSync(p, "utf8").split("\n").filter((l) => l.trim());
  const last = lines.at(-1);
  if (!last) return null;
  try {
    const o = JSON.parse(last) as { at?: unknown; ok?: unknown };
    return { at: typeof o.at === "string" ? o.at : "", ok: o.ok === true };
  } catch {
    return null;
  }
}

/** The `at` of the newest live evidence file of a change key, or "" with none. */
function newestEvidenceAt(root: string, key: string): string {
  let newest = "";
  for (const rel of listEvidence(root)) {
    if (rel.split("/")[2] !== key) continue;
    try {
      const ev = JSON.parse(readFileSync(join(root, rel), "utf8")) as { at?: unknown };
      if (typeof ev.at === "string" && cmpStr(ev.at, newest) > 0) newest = ev.at;
    } catch {
      // a damaged evidence file is a check finding
    }
  }
  return newest;
}

function readCurrent(root: string): { task?: string } | null {
  try {
    return JSON.parse(readFileSync(join(root, ".ctx/current.json"), "utf8")) as { task?: string };
  } catch {
    return null;
  }
}

/** REQ-LOOP-001 the decision of 024/D2. A pure function of the files. It writes nothing. */
export function decideNext(root: string, cfg: Config, data: Index, want?: string): Decision {
  const openspec = openspecCommand(cfg.gate.openspec);
  const d: Decision = { action: "stop", attempt: 0, change: null, command: null, human: false, max_attempts: cfg.loop.max_attempts, reason: null, state: "unknown", task: null, tasks: [] };
  const done = (o: Partial<Decision>): Decision => {
    const r = { ...d, ...o };
    if (!o.tasks) r.tasks = r.task === null ? [] : [r.task];
    return r;
  };

  // step 0 and step 1: the change under consideration, or the plan stop with no change
  const folders = activeFolders(root);
  const folder = want === undefined ? folders[0] : folders.find((f) => matchesChange(f, want));
  if (folder === undefined) {
    const name = want ?? "<name>";
    return done({ action: "plan", change: want ?? null, command: `${openspec} new change ${name}`, human: true, reason: want === undefined ? "no active change" : `no change ${want}`, state: "no_change" });
  }
  d.change = folder;
  const key = changeKey(folder);
  const entries = data.entries;
  const ofChange = (t: Entry): boolean => t.change === folder && !t.file.includes("/archive/");
  const qs = questions(root);

  // step 2: an open question for the change blocks it
  const blocking = qs.find((q) => q.status === "open" && (q.task === folder || q.task === key || q.task.startsWith(`${key}/`)));
  if (blocking) {
    const task = blocking.task.includes("/") ? blocking.task : null;
    const attempt = task ? failsInWindow(root, task, qs).length : 0;
    return done({ action: "ask", attempt, command: `specctx handoff resolve ${blocking.n} "<answer>"`, human: true, reason: blocking.text, state: "question_open", task });
  }

  // step 3: planning state from OpenSpec
  const st = openspecStatus(root, openspec, folder);
  if (!st.ok) return done({ action: "stop", reason: st.reason, state: "openspec_failed" });
  if (!st.state.isPlanningComplete) {
    return done({ action: "plan", command: st.state.nextStep ?? `${openspec} status --change ${folder}`, human: true, reason: "planning is not complete", state: "planning" });
  }

  // step 4: a citation gap in the files of the change
  const prefix = `openspec/changes/${folder}/`;
  const found = applyBaseline(root, check(root, cfg, data, true), []).findings
    .filter((f) => CITE_RULES.has(f.rule) && f.file.startsWith(prefix))
    .sort((a, b) => cmpTuple([a.file, a.line, a.rule], [b.file, b.line, b.rule]));
  if (found.length) {
    const first = found[0]!;
    const task = found.find((f) => TASK_RULES.has(f.rule))?.id ?? null;
    return done({ action: "cite", command: `specctx query --change ${folder} --kind req`, reason: `${first.rule} ${first.id} at ${first.file}:${first.line}`, state: "citation_missing", task });
  }

  // step 5: a hand tick without evidence gets the repair run
  const tasks = tasksOf(entries).filter(ofChange).sort((a, b) => cmpTuple([a.file, a.line], [b.file, b.line]));
  const ticked = tasks.find((t) => t.status === "done" && !hasEvidence(root, t));
  if (ticked) return done({ action: "repair", command: `specctx task done ${ticked.id}`, state: "done_without_evidence", task: ticked.id });

  // step 6: the current task of this change
  const cur = readCurrent(root);
  const current = cur?.task && cur.task.split("/")[0] === key ? tasks.find((t) => t.id === cur.task && t.status === "open") : undefined;
  if (current) {
    const fails = failsInWindow(root, current.id, qs);
    const last = fails.at(-1);
    // REQ-LOOP-006 the reason names the last fail line of the tail (029/D3)
    const reason = last ? `Verify failed (exit ${last.file.verify.exit ?? "timeout"}): ${failLine(last.file.stderr_tail)}` : null;
    if (fails.length >= cfg.loop.max_attempts && !openQuestionFor(root, current.id, qs)) {
      const q = capQuestion(current.id, fails.length, last?.file.stderr_tail ?? "");
      return done({ action: "ask", attempt: fails.length, command: `specctx handoff ask "${q}"`, human: true, reason, state: "attempts_exhausted", task: current.id });
    }
    if (fails.length) return done({ action: "fix", attempt: fails.length, command: `specctx task done ${current.id}`, reason, state: "task_failed", task: current.id });
    return done({ action: "work", command: `specctx task done ${current.id}`, state: "task_started", task: current.id });
  }

  // REQ-LOOP-008 step 6b: the done tasks whose evidence went stale get the repair run, earliest first, after the current task (031/D4, 031/D5)
  const stale: { id: string; path: string }[] = [];
  for (const t of tasks) {
    if (t.status !== "done") continue;
    const path = staleOf(root, t.id);
    if (path !== null) stale.push({ id: t.id, path });
  }
  if (stale.length) {
    // REQ-LOOP-008 one turn repairs every stale task (033/D1)
    return done({
      action: "repair",
      command: stale.map((s) => `specctx task reopen ${s.id} "stale evidence: ${s.path}" && specctx task done ${s.id}`).join(" && "),
      reason: stale.map((s) => `stale-evidence ${s.id} ${s.path}`).join(", "),
      state: "evidence_stale",
      task: stale[0]!.id,
      tasks: stale.map((s) => s.id),
    });
  }

  // step 7: the next open task
  const open = nextTask(root, entries, folder);
  if (open) return done({ action: "start", command: `specctx task start ${open.id}`, state: "task_open", task: open.id });

  // step 8: the gate must pass after the newest evidence
  const gate = lastGate(root);
  if (!gate || !gate.ok || cmpStr(gate.at, newestEvidenceAt(root, key)) < 0) {
    return done({ action: "gate", command: "specctx gate --strict", state: "gate_due" });
  }

  // step 9: archive, with the human stop from [loop] archive
  const archive = `${openspec} archive ${folder} -y`;
  if (cfg.loop.archive !== "ask") return done({ action: "archive", command: archive, human: false, state: "gate_passed" });
  // REQ-LOOP-007 a resolved archive question after the newest evidence is the approval. The stage field decides, not the text (031/D2).
  const newest = newestEvidenceAt(root, key);
  const approved = qs.filter((q) => q.status === "resolved" && q.task === folder && q.stage === "archive" && typeof q.resolved_at === "string" && cmpStr(q.resolved_at, newest) > 0).at(-1);
  if (approved) return done({ action: "archive", command: archive, human: false, reason: `archive approved in question ${approved.n}`, state: "gate_passed" });
  return done({ action: "archive", command: `specctx handoff ask --change ${folder} "archive ${folder}?"`, human: true, state: "gate_passed" });
}

/** REQ-LOOP-001 REQ-CLI-007 the human form: action first, one line per key, next last (024/D1). Strict mode. */
export function renderNext(d: Decision): string {
  const show = (v: unknown): string => (v === null ? "none" : String(v));
  const lines = [`action: ${d.action}`];
  for (const k of KEYS) {
    if (k === "action" || k === "command") continue;
    lines.push(`${k}: ${show(d[k])}`);
  }
  lines.push(`next: ${show(d.command)}`);
  return lines.join("\n") + "\n";
}
