// REQ-VER-005 REQ-VER-006 REQ-VER-007 the rerun step: the tasks a range closed, the compare, the groups (036/D1).
import { spawnSync } from "node:child_process";
import type { Entry } from "../index/types.ts";
import { changeKey, changeOf } from "../index/scan.ts";
import { cmpStr } from "../util/pystr.ts";

function git(root: string, args: string[]): { ok: boolean; out: string } {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, out: (r.stdout ?? "").trim() };
}

/** REQ-VER-005 the one line of a failed merge base. A shallow clone gets a second sentence. */
export function noMergeBaseLine(root: string, base: string): string {
  const shallow = git(root, ["rev-parse", "--is-shallow-repository"]);
  const tail = shallow.ok && shallow.out === "true" ? ". This clone is shallow" : "";
  return `rerun: no merge base with ${base}, fetch full history (fetch-depth: 0)${tail}`;
}

/** REQ-VER-005 the task ID order: the change key, then the group and the number as integers. */
export function cmpTaskId(a: string, b: string): number {
  const [ka, na = ""] = a.split("/");
  const [kb, nb = ""] = b.split("/");
  const k = cmpStr(ka!, kb!);
  if (k !== 0) return k;
  const pa = na.split(".").map(Number);
  const pb = nb.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

export interface TaskState {
  id: string;
  done: boolean;
  archived: boolean;
}

/** REQ-VER-005 the task lines of one tasks.md text, with the key that the index would give them. */
export function parseTasksFile(path: string, text: string, taskRe: RegExp): TaskState[] {
  const key = changeKey(changeOf(path));
  const archived = path.includes("/archive/");
  const out: TaskState[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = taskRe.exec(line);
    if (m) out.push({ id: `${key}/${m[2]!}`, done: m[1]!.toLowerCase() === "x", archived });
  }
  return out;
}

/** REQ-VER-005 one state per ID. An active copy wins over an archived copy, as findTask does. */
export function mergeStates(states: readonly TaskState[]): Map<string, TaskState> {
  const out = new Map<string, TaskState>();
  for (const s of states) {
    const had = out.get(s.id);
    if (!had || (had.archived && !s.archived)) out.set(s.id, s);
  }
  return out;
}

/** REQ-VER-005 the state of every task in the tasks.md files at a commit. */
export function tasksAt(root: string, sha: string, taskRe: RegExp): Map<string, TaskState> {
  const ls = git(root, ["ls-tree", "-r", "--name-only", sha, "--", "openspec/changes"]);
  const all: TaskState[] = [];
  if (!ls.ok) return new Map();
  for (const p of ls.out.split("\n").filter((x) => x.endsWith("/tasks.md")).sort(cmpStr)) {
    const show = spawnSync("git", ["show", `${sha}:${p}`], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (show.status === 0) all.push(...parseTasksFile(p, show.stdout, taskRe));
  }
  return mergeStates(all);
}

/** REQ-VER-005 the index entries of tasks, one per ID. The active copy wins. */
export function headStates(entries: readonly Entry[]): Map<string, { state: TaskState; entry: Entry }> {
  const out = new Map<string, { state: TaskState; entry: Entry }>();
  for (const e of entries) {
    if (e.kind !== "task") continue;
    const archived = e.file.includes("/archive/");
    const had = out.get(e.id);
    if (!had || (had.state.archived && !archived)) out.set(e.id, { state: { id: e.id, done: e.status === "done", archived }, entry: e });
  }
  return out;
}

export type ClosedResult = { ok: true; mergeBase: string; tasks: Entry[] } | { ok: false; line: string };

/**
 * REQ-VER-005 the tasks that are done at HEAD and open or absent at the merge base, in ID order.
 * `entries` is the live index. `taskRe` is the task regex of the scanner.
 */
export function closedTasks(root: string, base: string, entries: readonly Entry[], taskRe: RegExp): ClosedResult {
  const mb = git(root, ["merge-base", "HEAD", base]);
  if (!mb.ok || !mb.out) return { ok: false, line: noMergeBaseLine(root, base) };
  const before = tasksAt(root, mb.out, taskRe);
  const tasks: Entry[] = [];
  for (const [id, { state, entry }] of headStates(entries)) {
    if (state.done && !before.get(id)?.done) tasks.push(entry);
  }
  tasks.sort((a, b) => cmpTaskId(a.id, b.id));
  return { ok: true, mergeBase: mb.out, tasks };
}

/** The part of an evidence file that the compare reads. */
export interface EvidenceView {
  kind: "command" | "manual";
  command: string | null;
  exit: number | null;
  cwd?: string;
}

/** The Verify clause of a task line as tasks.md has it now. */
export interface VerifyView {
  command: string | null;
  cwd?: string;
}

export type FailKind = "manual" | "no-evidence" | "verify-drift" | "weak-verify" | "mismatch";

/** REQ-VER-006 the verdict before any process runs. Only `run` reaches a process. */
export type Verdict =
  | { act: "warn"; why: "manual" }
  | { act: "fail"; kind: Exclude<FailKind, "mismatch">; detail?: string }
  | { act: "run"; command: string; cwd: string; expected: number | null };

/** REQ-VER-006 compare one closed task with its evidence, in the fixed order of 036/D4. */
export function compare(verify: VerifyView, evidence: EvidenceView | null, strict: boolean, weak: (c: string) => boolean): Verdict {
  if (evidence !== null && evidence.kind === "manual") return strict ? { act: "fail", kind: "manual" } : { act: "warn", why: "manual" };
  if (evidence === null) return { act: "fail", kind: "no-evidence" };
  const cwd = evidence.cwd ?? ".";
  if (verify.command !== evidence.command || (verify.cwd ?? ".") !== cwd) {
    return { act: "fail", kind: "verify-drift", detail: `tasks.md has ${verify.command ?? "no command"}${verify.cwd ? ` (cwd ${verify.cwd})` : ""}, evidence has ${evidence.command ?? "no command"}${evidence.cwd ? ` (cwd ${evidence.cwd})` : ""}` };
  }
  if (evidence.command === null) return { act: "fail", kind: "no-evidence" };
  if (strict && weak(evidence.command)) return { act: "fail", kind: "weak-verify" };
  return { act: "run", command: evidence.command, cwd, expected: evidence.exit };
}

/** REQ-VER-007 the key that makes two runs the same run. */
export const runKey = (v: { command: string; cwd: string }): string => `${v.cwd}\u0000${v.command}`;

export interface RunItem {
  id: string;
  command: string;
  cwd: string;
}

/** REQ-VER-007 one group per frozen command and cwd, in the ID order of the first task. */
export function groupRuns<T extends RunItem>(items: readonly T[]): { key: string; command: string; cwd: string; members: T[] }[] {
  const sorted = [...items].sort((a, b) => cmpTaskId(a.id, b.id));
  const groups = new Map<string, { key: string; command: string; cwd: string; members: T[] }>();
  for (const it of sorted) {
    const key = runKey(it);
    const g = groups.get(key);
    if (g) g.members.push(it);
    else groups.set(key, { key, command: it.command, cwd: it.cwd, members: [it] });
  }
  return [...groups.values()];
}

export interface Outcome {
  exit: number | null;
  timedOut: boolean;
  output: string;
}

/** REQ-VER-006 ok when the exit code equals the evidence. A timeout or a different code is a mismatch. */
export function judge(expected: number | null, o: Outcome): "ok" | "mismatch" {
  return !o.timedOut && o.exit !== null && o.exit === expected ? "ok" : "mismatch";
}

const shq = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;

/** REQ-VER-007 the line that runs the frozen command on a developer machine as the rerun runs it. */
export function reproduceLine(command: string, cwd: string): string {
  return `reproduce: cd ${shq(cwd)} && env CI=1 SPECCTX_RERUN=1 sh -c ${shq(command)}`;
}

export interface MismatchInfo {
  id: string;
  file: string;
  line: number;
  evidence: string;
  expected: number | null;
  outcome: Outcome;
  command: string;
  cwd: string;
  timeoutS: number;
}

/** REQ-VER-007 the report of a mismatch. The output tail is the last 20 lines. */
export function formatMismatch(m: MismatchInfo): string {
  const tailLines = m.outcome.output.replace(/\n$/, "") === "" ? [] : m.outcome.output.replace(/\n$/, "").split("\n").slice(-20);
  const actual = m.outcome.timedOut ? `timed out after ${m.timeoutS}s` : `exit ${m.outcome.exit}`;
  return [
    `${m.id}: mismatch`,
    `  at ${m.file}:${m.line}`,
    `  evidence ${m.evidence}`,
    `  expected exit ${m.expected}`,
    `  actual ${actual}`,
    "  output (last 20 lines):",
    ...tailLines.map((l) => `    ${l}`),
    `  ${reproduceLine(m.command, m.cwd)}`,
  ].join("\n") + "\n";
}
