// REQ-QRY-001 token AND over id, title, text. Score 3 for id, 2 for title, 1 for text, per term.
import { poolOf } from "../index/canonical.ts";
import type { Entry } from "../index/types.ts";
import { cmpTuple, pySplit } from "../util/pystr.ts";

export interface QueryOpts {
  kind?: string;
  change?: string;
  all?: boolean;
  limit?: number;
}

export function query(entries: Entry[], args: string[], o: QueryOpts = {}): Entry[] {
  const terms = args.flatMap((a) => pySplit(a.toLowerCase()));
  const hits: [number, string, string, number, Entry][] = [];
  for (const e of poolOf(entries, !!o.all)) {
    if ((o.kind && e.kind !== o.kind) || (o.change && e.change !== o.change)) continue;
    const idl = e.id.toLowerCase();
    const tl = e.title.toLowerCase();
    const xl = e.text ?? "";
    if (!terms.every((t) => idl.includes(t) || tl.includes(t) || xl.includes(t))) continue;
    let score = 0;
    for (const t of terms) score += 3 * +idl.includes(t) + 2 * +tl.includes(t) + +xl.includes(t);
    hits.push([-score, e.id, e.file, e.line, e]);
  }
  hits.sort((a, b) => cmpTuple(a.slice(0, 4) as (string | number)[], b.slice(0, 4) as (string | number)[]));
  let out = hits.map((h) => h[4]);
  const limit = o.limit ?? 20;
  if (limit > 0) out = out.slice(0, limit);
  return out;
}

export function queryLine(e: Entry): string {
  return `${e.id}  ${e.kind}  ${e.status}  ${e.file}:${e.line}  ${e.title}`;
}
