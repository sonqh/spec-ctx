// REQ-QRY-002 IDs reachable from a start ID, with the reason each one was included.
import { canon, poolOf } from "../index/canonical.ts";
import type { Entry } from "../index/types.ts";
import { cmpStr, cmpTuple } from "../util/pystr.ts";
import { fileEdges } from "./files.ts";

// REQ-QRY-003 fixed block order after the requested IDs
export const KIND_RANK: Record<string, number> = { adr: 0, decision: 1, req: 2, scn: 2, task: 3, code: 4, test: 5 };

export const REASONS = ["scenario of", "ref from", "ref to", "decision for", "task cites", "implements", "covers", "mentions"];

/** REQ-QRY-005 a start that is no ID is a repository path. Its links seed the walk, and the walk adds no code or test row. */
export function related(entries: Entry[], start: string, depth: number, all = false): [string, string][] {
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
  const found = new Map<string, string>();
  const add = (i: string, reason: string): boolean => {
    if (seeds && ids.get(i) && (ids.get(i)!.kind === "code" || ids.get(i)!.kind === "test")) return false;
    if (i !== start && !found.has(i)) {
      found.set(i, reason);
      return true;
    }
    return false;
  };
  const isId = ids.has(start) || entries.some((e) => e.id === start);
  const seeds = isId ? null : fileEdges(entries, start);
  const frontier0: string[] = [start];
  if (seeds) {
    frontier0.length = 0;
    for (const [i, reason] of seeds) if (add(i, reason)) frontier0.push(i);
  }
  const s = ids.get(start);
  if (s && s.kind === "req") for (const sid of s.scenarios ?? []) add(sid, `scenario of ${start}`);
  let frontier = frontier0;
  for (let d = 0; d < depth; d++) {
    const nxt: string[] = [];
    for (const x of frontier) {
      const ex = ids.get(x);
      if (ex) {
        for (const r of ex.refs) if (add(r, `ref from ${x}`)) nxt.push(r);
        if (ex.kind === "req") {
          for (const sid of ex.scenarios ?? []) if (add(sid, `scenario of ${x}`)) nxt.push(sid);
        }
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
        if (add(y, reason)) nxt.push(y);
      }
    }
    frontier = nxt;
  }
  const rank = (i: string): [number, string] => {
    const e = ids.get(i);
    return [e ? (KIND_RANK[e.kind] ?? 9) : 9, i];
  };
  return [...found.keys()].sort((a, b) => cmpTuple(rank(a), rank(b))).map((i) => [i, found.get(i)!]);
}
