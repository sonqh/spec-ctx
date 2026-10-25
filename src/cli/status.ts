// REQ-CLI-001 status reads the index, the handoff file, and the .openspec.yaml of each archive folder.
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
  current: string | null;
  open_questions: string[];
}

/** REQ-HND-003 the current task from the handoff file. */
function handoffCurrent(root: string): string | null {
  const p = join(root, HANDOFF_PATH);
  if (!existsSync(p)) return null;
  for (const line of splitLines(readFileSync(p).toString("utf8"))) {
    const m = /^current: (.*)$/s.exec(line);
    if (m) return pyStrip(m[1]!);
  }
  return null;
}

/**
 * The `archived` value of an archive folder. OpenSpec does not write it today,
 * so the date at the start of the folder name is the fallback.
 */
export function archivedAt(root: string, folder: string): string {
  const p = join(root, "openspec", "changes", "archive", folder, ".openspec.yaml");
  if (existsSync(p)) {
    const m = /^archived:[ \t]*["']?([^"'\s#]+)/m.exec(readFileSync(p, "utf8"));
    if (m) return m[1]!;
  }
  return /^\d{4}-\d{2}-\d{2}/.exec(folder)?.[0] ?? "";
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
  // REQ-CLI-001 order by the archived time in .openspec.yaml, then by folder name
  const last = [...archived].map((n) => ({ n, at: archivedAt(root, n) })).sort((a, b) => cmpStr(a.at, b.at) || cmpStr(a.n, b.n)).pop()?.n;
  const handoff = existsSync(join(root, HANDOFF_PATH));
  return {
    changes: [...changes.keys()].sort(cmpStr).map((c) => ({ change: c, ...changes.get(c)! })),
    last_archived: last ? changeOf(`openspec/changes/archive/${last}/`) : null,
    uncovered: uncovered.length,
    handoff,
    current: handoff ? handoffCurrent(root) : null,
    open_questions: handoff ? openQuestions(root) : [],
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
    if (r.current !== null) out.push(`current: ${r.current}`);
    out.push(`open_questions: ${r.open_questions.length}`);
    // with no active change the questions are the agenda, so status prints them
    if (!r.changes.length) for (const q of r.open_questions) out.push(`- ${q}`);
  }
  const next = nextStep(r);
  if (next) out.push(`next: ${next}`);
  return out;
}

/** REQ-CLI-007 the next step by state: an open task, then a change with every task done, then uncovered REQs. */
export function nextStep(r: StatusReport): string | null {
  if (r.changes.some((c) => c.open > 0)) return "specctx task next";
  const ready = r.changes.find((c) => c.done > 0 && c.open === 0);
  if (ready) return `archive ${ready.change}`;
  if (r.uncovered > 0) return "specctx check";
  return null;
}
