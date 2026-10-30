// REQ-QRY-002 IDs reachable from a start ID, with the reason each one was included.
import { canon, poolOf } from "../index/canonical.ts";
import type { Entry } from "../index/types.ts";
import { cmpStr, cmpTuple } from "../util/pystr.ts";
import { fileEdges } from "./files.ts";
import { structuralEdges, structure } from "./links.ts";

// REQ-QRY-003 fixed block order after the requested IDs
// REQ-QRY-012 capability and change lines print after the test lines (046/D7)
export const KIND_RANK: Record<string, number> = { adr: 0, decision: 1, req: 2, scn: 2, task: 3, code: 4, test: 5, cap: 6, change: 7 };

export const REASONS = [
  "scenario of", "ref from", "ref to", "decision for", "task cites", "implements", "covers", "mentions",
  "delta in", "design named in", "task names", "capability of", "requirement in", "capability touched by", "main version of",
];

/** REQ-QRY-012 the reason and the distance from the start. A seed of a path has depth 1. */
export interface Hit {
  reason: string;
  depth: number;
}

/** The walk behind `related` and `bundle`. The map keeps the insertion order and the depth of each entry (046/D7). */
export function walkFound(entries: Entry[], start: string, depth: number, all = false): Map<string, Hit> {
  const pool = poolOf(entries, all);
  const ids = canon(entries);
  for (const e of pool) if (!ids.has(e.id)) ids.set(e.id, e);
  const back = new Map<string, Set<string>>();
  for (const e of pool) {
    for (const r of e.refs) {
      let s = back.get(r);
      if (!s) back.set(r, (s = new Set()));
      s.add(e.id);
    }
  }
  const S = structure(entries);
  const found = new Map<string, Hit>();
  const add = (i: string, reason: string, d: number): boolean => {
    if (seeds && ids.get(i) && (ids.get(i)!.kind === "code" || ids.get(i)!.kind === "test")) return false;
    if (i !== start && !found.has(i)) {
      found.set(i, { reason, depth: d });
      return true;
    }
    return false;
  };
  const isId = ids.has(start) || entries.some((e) => e.id === start);
  const seeds = isId ? null : fileEdges(entries, start);
  const frontier0: string[] = [start];
  if (seeds) {
    frontier0.length = 0;
    for (const [i, reason] of seeds) if (add(i, reason, 1)) frontier0.push(i);
  }
  const s = ids.get(start);
  if (s && s.kind === "req") for (const sid of s.scenarios ?? []) add(sid, `scenario of ${start}`, 1);
  let frontier = frontier0;
  for (let d = 0; d < depth; d++) {
    const nxt: string[] = [];
    const dd = d + (seeds ? 2 : 1);
    for (const x of frontier) {
      const ex = ids.get(x);
      if (ex) {
        for (const r of ex.refs) if (add(r, `ref from ${x}`, dd)) nxt.push(r);
        if (ex.kind === "req") {
          for (const sid of ex.scenarios ?? []) if (add(sid, `scenario of ${x}`, dd)) nxt.push(sid);
        }
        for (const [t, reason] of structuralEdges(S, ex, x, x === start, (id) => ids.has(id))) if (add(t, reason, dd)) nxt.push(t);
      }
      for (const y of [...(back.get(x) ?? [])].sort(cmpStr)) {
        const ey = ids.get(y);
        const k = ey ? ey.kind : "?";
        let reason: string;
        if (k === "scn" && ex && (ex.scenarios ?? []).includes(y)) reason = `scenario of ${x}`;
        else if (k === "decision") reason = `decision for ${x}`;
        else if (k === "task") reason = `task cites ${x}`;
        else if (k === "code") reason = `implements ${x}`;
        else if (k === "test") reason = `covers ${x}`;
        else reason = `ref to ${x}`;
        if (add(y, reason, dd)) nxt.push(y);
      }
    }
    frontier = nxt;
  }
  return found;
}

/** The main version of a modified requirement, or undefined. */
export function mainVersion(entries: Entry[], id: string): Entry | undefined {
  return structure(entries).main.get(id);
}

/** REQ-QRY-005 a start that is no ID is a repository path. Its links seed the walk, and the walk adds no code or test row. */
export function related(entries: Entry[], start: string, depth: number, all = false): [string, string][] {
  const ids = canon(entries);
  for (const e of poolOf(entries, all)) if (!ids.has(e.id)) ids.set(e.id, e);
  const found = walkFound(entries, start, depth, all);
  const rank = (i: string): [number, string] => {
    const e = ids.get(i);
    return [e ? (KIND_RANK[e.kind] ?? 9) : 9, i];
  };
  const out: [string, string][] = [];
  // REQ-QRY-010 the main version of a modified requirement follows the pair of its delta. --all lists both copies already.
  const withMain = (i: string, reason: string): void => {
    out.push([i, reason]);
    if (!all && mainVersion(entries, i)) out.push([i, `main version of ${i}`]);
  };
  if (!all && mainVersion(entries, start)) out.push([start, `main version of ${start}`]);
  for (const i of [...found.keys()].sort((a, b) => cmpTuple(rank(a), rank(b)))) withMain(i, found.get(i)!.reason);
  return out;
}
