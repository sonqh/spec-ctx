// REQ-IDX-002 deterministic JSON: sorted keys, two-space indent, UTF-8 kept as is.
import { cmpStr } from "./pystr.ts";

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v !== null && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort(cmpStr)) out[k] = sortKeys((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}

export function dumps(v: unknown): string {
  return JSON.stringify(sortKeys(v), null, 2);
}
