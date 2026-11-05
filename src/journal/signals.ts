// REQ-JRN-002 the signals of one context run. They read the provenance lines of the printed text (057/D3).
import { parseProvenance } from "../graph/bundle.ts";
import { canon } from "../index/canonical.ts";
import type { Entry } from "../index/types.ts";
import type { Signal } from "./note.ts";

/** Only `context` calls this. No provenance line gives empty-context. A kept code or test block gives context-has-code-or-test. */
export function contextSignals(entries: Entry[], b: { text: string; complete: boolean }): Signal[] {
  const ids = canon(entries);
  const out: Signal[] = [];
  let lines = 0;
  let line = false;
  for (const l of b.text.split("\n")) {
    const id = parseProvenance(l);
    if (id === null) continue;
    lines++;
    const k = ids.get(id)?.kind;
    if (k === "code" || k === "test") line = true;
  }
  if (lines === 0) out.push("empty-context");
  if (line) out.push("context-has-code-or-test");
  if (!b.complete) out.push("truncated-context");
  return out;
}
