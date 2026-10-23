// REQ-IDX-003 one canonical entry per REQ, SCN, and ADR ID.
import { cmpTuple } from "../util/pystr.ts";
import type { Entry } from "./types.ts";

export const SPEC_KINDS = new Set(["req", "scn", "adr"]);

/** Canonical order: active change, then openspec/specs, then archive. A removed entry is never canonical. */
export function tier(e: Entry): number | null {
  const st = e.status;
  if (st === "removed") return null;
  if (st === "modified" || (st === "active" && e.change !== "main")) return 0;
  if (st === "active") return 1;
  return 2;
}

export function markCanonical(entries: Entry[]): void {
  const best = new Map<string, [[number, string, number], Entry]>();
  for (const e of entries) {
    if (!SPEC_KINDS.has(e.kind)) {
      e.canonical = true;
      continue;
    }
    e.canonical = false;
    const t = tier(e);
    if (t === null) continue;
    const key: [number, string, number] = [t, e.file, e.line];
    const cur = best.get(e.id);
    if (!cur || cmpTuple(key, cur[0]) < 0) best.set(e.id, [key, e]);
  }
  for (const [, e] of best.values()) e.canonical = true;
}

/** Canonical entries by ID. A later entry with the same ID wins, as in the Python oracle. */
export function canon(entries: Entry[]): Map<string, Entry> {
  const m = new Map<string, Entry>();
  for (const e of entries) if (e.canonical) m.set(e.id, e);
  return m;
}

export function poolOf(entries: Entry[], all: boolean): Entry[] {
  return all ? entries : entries.filter((e) => e.canonical);
}
