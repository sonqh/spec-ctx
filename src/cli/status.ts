// REQ-CLI-001 status reads only the index and the handoff file.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { changeOf } from "../index/scan.ts";
import type { Entry } from "../index/types.ts";
import { cmpStr, pyStrip, splitLines } from "../util/pystr.ts";

export const HANDOFF_PATH = ".ctx/handoff.md";

/** First line of each open_questions item in the handoff file. */
export function openQuestions(root: string): string[] {
  const p = join(root, HANDOFF_PATH);
  if (!existsSync(p)) return [];
  const items: string[] = [];
  let inside = false;
  for (const line of splitLines(readFileSync(p).toString("utf8"))) {
    if (line.startsWith("open_questions:")) {
      inside = true;
      continue;
    }
    if (!inside) continue;
    if (line.startsWith("- ")) items.push(pyStrip(line.slice(2)));
    else if (pyStrip(line) && !line.startsWith(" ") && !line.startsWith("\t")) break;
  }
  return items;
}

export interface StatusReport {
  changes: { change: string; done: number; open: number }[];
  last_archived: string | null;
  uncovered: number;
  handoff: boolean;
  open_questions: string[];
}

export function statusReport(root: string, entries: Entry[]): StatusReport {
  const changes = new Map<string, { done: number; open: number }>();
  const archived = new Set<string>();
  for (const e of entries) {
    const m = /^openspec\/changes\/archive\/([^/]+)\//.exec(e.file);
    if (m) {
      archived.add(m[1]!);
      continue;
    }
    if (e.kind === "task" && (e.status === "done" || e.status === "open") && e.change !== "main") {
      let c = changes.get(e.change);
      if (!c) changes.set(e.change, (c = { done: 0, open: 0 }));
      c[e.status]++;
    }
  }
  const covered = new Set(entries.filter((e) => e.kind === "test").flatMap((e) => e.refs));
  const uncovered = entries.filter((e) => e.kind === "req" && e.change === "main" && e.status === "active" && !covered.has(e.id));
  // archive folders start with a date, so the greatest name is the last archived change
  const last = [...archived].sort(cmpStr).pop();
  const handoff = existsSync(join(root, HANDOFF_PATH));
  return {
    changes: [...changes.keys()].sort(cmpStr).map((c) => ({ change: c, ...changes.get(c)! })),
    last_archived: last ? changeOf(`openspec/changes/archive/${last}/`) : null,
    uncovered: uncovered.length,
    handoff,
    open_questions: handoff && changes.size === 0 ? openQuestions(root) : [],
  };
}

export function statusLines(r: StatusReport): string[] {
  const out = r.changes.map((c) => `${c.change}  done ${c.done}  open ${c.open}`);
  if (!r.changes.length) {
    out.push("no active change");
    if (r.last_archived !== null) out.push(`last archived: ${r.last_archived}`);
  }
  out.push(`uncovered active REQs in main: ${r.uncovered}`);
  if (r.handoff) {
    out.push(`handoff: ${HANDOFF_PATH} (read it first)`);
    if (!r.changes.length) {
      out.push(`open_questions: ${r.open_questions.length}`);
      for (const q of r.open_questions) out.push(`- ${q}`);
    }
  }
  return out;
}
