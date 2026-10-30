// REQ-QRY-009 REQ-QRY-010 REQ-QRY-011 structural edges. They come from the change, file, and status fields and from the
// design links of tasks, at query time. The index stores no copy of them (046/D4).
import type { Entry } from "../index/types.ts";
import { cmpStr } from "../util/pystr.ts";

const CHANGE_DIR = /^(openspec\/changes\/(?:archive\/)?[^/]+)\//;
const CAP_SPEC = /(?:^|\/)specs\/([^/]+)\/spec\.md$/;

/** The change folder that holds a file, or undefined. */
export const folderOf = (file: string): string | undefined => CHANGE_DIR.exec(file)?.[1];

/** The capability name of a `specs/<cap>/spec.md` path, or undefined. */
export const capNameOf = (file: string): string | undefined => CAP_SPEC.exec(file)?.[1];

export interface Structure {
  /** change folder to the IDs of the requirements and scenarios of its delta specs */
  deltas: Map<string, string[]>;
  /** change folder to the capability names its delta specs touch */
  caps: Map<string, string[]>;
  /** capability name to the IDs of its canonical requirements */
  reqsOfCap: Map<string, string[]>;
  /** task ID to the decision IDs in its links */
  designs: Map<string, string[]>;
  /** decision ID to the task IDs that name it */
  tasksOf: Map<string, string[]>;
  /** ID of a modified requirement to its main version */
  main: Map<string, Entry>;
}

function push(m: Map<string, string[]>, k: string, v: string): void {
  const l = m.get(k);
  if (!l) m.set(k, [v]);
  else if (!l.includes(v)) l.push(v);
}

const cache = new WeakMap<Entry[], Structure>();

export function structure(entries: Entry[]): Structure {
  let s = cache.get(entries);
  if (s) return s;
  s = { deltas: new Map(), caps: new Map(), reqsOfCap: new Map(), designs: new Map(), tasksOf: new Map(), main: new Map() };
  const modified = new Set<string>();
  for (const e of entries) {
    if (e.kind === "req" || e.kind === "scn") {
      const dir = folderOf(e.file);
      const cap = capNameOf(e.file);
      if (dir && cap) {
        push(s.deltas, dir, e.id);
        push(s.caps, dir, cap);
      }
      if (e.kind === "req" && e.canonical && cap) push(s.reqsOfCap, cap, e.id);
      if (e.kind === "req" && e.canonical && e.status === "modified") modified.add(e.id);
    } else if (e.kind === "task" && e.links) {
      for (const l of e.links) {
        if (!l.startsWith("design:")) continue;
        const d = l.slice(7);
        push(s.designs, e.id, d);
        push(s.tasksOf, d, e.id);
      }
    }
  }
  for (const e of entries) {
    if (e.kind === "req" && !e.canonical && e.status === "active" && e.change === "main" && modified.has(e.id) && !s.main.has(e.id)) {
      s.main.set(e.id, e);
    }
  }
  for (const l of [s.caps, s.reqsOfCap, s.tasksOf]) for (const v of l.values()) v.sort(cmpStr);
  cache.set(entries, s);
  return s;
}

/**
 * The structural edges that leave one entry, as [ID, reason] pairs. A task reaches its deltas and a
 * capability reaches its requirements only when each is the start of the walk (046/D5).
 */
export function structuralEdges(s: Structure, ex: Entry, x: string, isStart: boolean, has: (id: string) => boolean): [string, string][] {
  const out: [string, string][] = [];
  const put = (id: string, reason: string): void => {
    if (has(id)) out.push([id, reason]);
  };
  if (ex.kind === "task") {
    // like a capability, a task reaches its deltas only as the start, so depth 2 adds no sibling (046/D5)
    const dir = folderOf(ex.file);
    if (isStart) for (const id of (dir && s.deltas.get(dir)) || []) put(id, `delta in change of ${x}`);
    for (const id of s.designs.get(x) ?? []) put(id, `design named in ${x}`);
  } else if (ex.kind === "decision") {
    for (const id of s.tasksOf.get(x) ?? []) put(id, `task names ${x}`);
  } else if (ex.kind === "req") {
    const cap = capNameOf(ex.file);
    if (cap) put(`cap/${cap}`, `capability of ${x}`);
  } else if (ex.kind === "cap" && isStart) {
    for (const id of s.reqsOfCap.get(ex.title) ?? []) put(id, `requirement in ${x}`);
  } else if (ex.kind === "change") {
    const dir = folderOf(ex.file);
    for (const id of (dir && s.deltas.get(dir)) || []) put(id, `delta in ${x}`);
    for (const c of (dir && s.caps.get(dir)) || []) put(`cap/${c}`, `capability touched by ${x}`);
  }
  return out;
}
