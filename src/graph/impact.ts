// REQ-QRY-028 REQ-QRY-029 REQ-QRY-030 the impact of one file: its requirements, their tasks, and a verify plan.
import { join } from "node:path";
import { canon } from "../index/canonical.ts";
import type { Entry } from "../index/types.ts";
import { namesMissingPath } from "../tasks/files.ts";
import { taskText } from "../tasks/tasks.ts";
import { cmpStr } from "../util/pystr.ts";
import { parseVerify } from "../verify/parse.ts";
import { fileEdges } from "./files.ts";
import { Trust } from "./trust.ts";

export interface ImpactReq {
  id: string;
  title: string;
  state: "verified" | "unverified";
  reason: string;
}

export interface ImpactTask {
  id: string;
  change: string;
  status: string;
  state: string;
  reqs: string[];
  archived: boolean;
  file: string;
  line: number;
  title: string;
  verify: string | null;
}

export interface PlanEntry {
  command: string;
  cwd?: string;
  tasks: string[];
}

export interface Impact {
  file: string;
  requirements: ImpactReq[];
  tasks: ImpactTask[];
  verify: PlanEntry[];
  more: number;
  archived: { tasks: number; dropped: number; listed: boolean };
}

export interface ImpactOpts {
  archived?: boolean;
  all?: boolean;
}

/** REQ-QRY-030 the default plan shows this many commands */
export const PLAN_CAP = 10;

const isArchived = (e: Entry): boolean => e.file.includes("/archive/");

/** The impact of a repository path. A pure function of the entries and the files (068/D1 to D5). */
export function impactOf(root: string, entries: Entry[], path: string, opts: ImpactOpts = {}): Impact {
  const ids = canon(entries);
  const trust = new Trust(root, entries);
  const reqs = new Map<string, ImpactReq>();
  const named: string[] = [];
  const addReq = (id: string, reason: string): void => {
    const e = ids.get(id);
    if (!e || e.kind !== "req" || reqs.has(id)) return;
    reqs.set(id, { id, title: e.title, state: trust.reqState(id), reason });
  };
  for (const [id, reason] of fileEdges(entries, path)) {
    const e = ids.get(id);
    if (!e) continue;
    if (e.kind === "req") addReq(id, reason);
    else if (e.kind === "task") {
      named.push(id);
      for (const r of trust.task(id)?.refs ?? []) addReq(r, `task names ${path} in ${id}`);
    }
  }
  const found = new Map<string, Entry>();
  for (const id of reqs.keys()) for (const t of trust.citing(id)) found.set(t.id, t);
  for (const id of named) {
    const t = trust.task(id);
    if (t && !isArchived(t)) found.set(id, t);
  }
  const all = [...found.values()].sort((a, b) => cmpStr(a.id, b.id));
  const active = all.filter((t) => !isArchived(t));
  const old = all.filter(isArchived);
  const toTask = (t: Entry): ImpactTask => ({
    id: t.id, change: t.change, status: t.status, state: trust.taskState(t.id), reqs: [...t.refs],
    archived: isArchived(t), file: t.file, line: t.line, title: taskText(t.title), verify: parseVerify(t.title).command,
  });
  // REQ-QRY-030 one entry for each cwd and command. Active tasks come first. An archived command that names a missing file drops.
  const plan = new Map<string, PlanEntry & { active: boolean }>();
  let dropped = 0;
  const droppedKeys = new Set<string>();
  for (const [group, list] of [[true, active], [false, old]] as const) {
    for (const t of list) {
      const v = parseVerify(t.title);
      if (v.kind !== "command" || !v.command) continue;
      const key = `${v.cwd ?? ""}\0${v.command}`;
      const cur = plan.get(key);
      if (cur) {
        cur.tasks.push(t.id);
        continue;
      }
      if (!group && namesMissingPath(root, v.cwd ? join(root, v.cwd) : root, v.command)) {
        if (!droppedKeys.has(key)) {
          droppedKeys.add(key);
          dropped++;
        }
        continue;
      }
      plan.set(key, { command: v.command, ...(v.cwd ? { cwd: v.cwd } : {}), tasks: [t.id], active: group });
    }
  }
  const order = (a: PlanEntry & { active: boolean }, b: PlanEntry & { active: boolean }): number =>
    Number(!a.active) - Number(!b.active) || cmpStr(a.command, b.command) || cmpStr(a.cwd ?? "", b.cwd ?? "");
  const sorted = [...plan.values()].sort(order).map(({ command, cwd, tasks }) => ({ command, ...(cwd ? { cwd } : {}), tasks: tasks.sort(cmpStr) }));
  const shown = opts.all ? sorted : sorted.slice(0, PLAN_CAP);
  return {
    file: path,
    requirements: [...reqs.values()],
    tasks: [...active, ...(opts.archived ? old : [])].map(toTask),
    verify: shown,
    more: sorted.length - shown.length,
    archived: { tasks: old.length, dropped, listed: !!opts.archived },
  };
}

const clip = (s: string, n: number): string => (s.length > n ? s.slice(0, n - 3) + "..." : s);

/** REQ-QRY-029 the text form: sections with two space indented lines, then the more line and the archived line. */
export function impactLines(i: Impact): string[] {
  const out = [`impact ${i.file}`, `requirements (${i.requirements.length})`];
  for (const r of i.requirements) out.push(`  ${r.id}  ${r.state}  ${r.reason}  ${clip(r.title, 60)}`);
  out.push(`tasks (${i.tasks.length})`);
  for (const t of i.tasks) out.push(`  ${t.id}  ${t.status}  ${t.state}${t.archived ? "  archived" : ""}  ${t.reqs.join(",")}  ${clip(t.title, 60)}`);
  out.push(`verify (${i.verify.length})`);
  for (const v of i.verify) out.push(`  ${v.cwd ? `cwd=${v.cwd} ` : ""}${v.command}`);
  if (i.more) out.push(`${i.more} more. Use --all.`);
  const a = i.archived;
  if (a.tasks || a.dropped) {
    out.push(a.listed ? `archived: ${a.tasks} tasks listed, ${a.dropped} Verify commands dropped.` : `archived: ${a.tasks} tasks, ${a.dropped} Verify commands dropped. Use --archived to list the tasks.`);
  }
  return out;
}
