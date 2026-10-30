// REQ-CHK-003 evidence rules of check --strict.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Entry, Problem } from "../index/types.ts";
import { fileSha256 } from "../util/hash.ts";
import { evidenceRel } from "../tasks/tasks.ts";

/**
 * REQ-CHK-003 REQ-LOOP-008 the stale paths of one evidence file, sorted. A damaged file is stale as a whole and
 * returns its own path. check and next both read this, so the two never differ (031/D5).
 */
export function staleFiles(root: string, rel: string): string[] {
  let files: Record<string, string> = {};
  try {
    const ev = JSON.parse(readFileSync(join(root, rel), "utf8")) as { files?: Record<string, string> };
    files = ev.files ?? {};
  } catch {
    return [rel];
  }
  return Object.keys(files).filter((p) => fileSha256(join(root, p)) !== files[p]).sort();
}

/** REQ-LOOP-008 the first stale path of the evidence of a task, or null when it is fresh or absent (031/D5). */
export function staleOf(root: string, task: string): string | null {
  const rel = evidenceRel({ id: task });
  if (!existsSync(join(root, rel))) return null;
  return staleFiles(root, rel)[0] ?? null;
}

export function evidenceFindings(root: string, entries: Entry[], evidence: string[]): Problem[] {
  const out: Problem[] = [];
  const tasks = new Map<string, Entry[]>();
  for (const e of entries) {
    if (e.kind !== "task") continue;
    const l = tasks.get(e.id) ?? [];
    l.push(e);
    tasks.set(e.id, l);
  }
  const have = new Set<string>();
  for (const rel of evidence) {
    const parts = rel.split("/");
    const id = `${parts[2]}/${parts[3]!.replace(/\.json$/, "")}`;
    have.add(id);
    const copies = tasks.get(id) ?? [];
    const active = copies.find((t) => !t.file.includes("/archive/"));
    const task = active ?? copies[0];
    if (!task || task.status !== "done") {
      out.push([rel, 1, "evidence-without-done", id]);
      continue;
    }
    // archived changes are exempt from stale-evidence
    if (!active) continue;
    for (const path of staleFiles(root, rel)) out.push([rel, 1, "stale-evidence", `${id} ${path}`]);
  }
  for (const e of entries) {
    if (e.kind === "task" && e.status === "done" && !e.file.includes("/archive/") && !have.has(e.id)) {
      out.push([e.file, e.line, "done-without-evidence", e.id]);
    }
  }
  return out;
}

/** REQ-CHK-003 manual evidence for a task in an active change is a warning, not a finding. */
export function manualWarnings(root: string, entries: Entry[], evidence: string[]): string[] {
  const active = new Set(entries.filter((e) => e.kind === "task" && !e.file.includes("/archive/") && e.change !== "main").map((e) => e.id));
  const out: string[] = [];
  for (const rel of evidence) {
    const parts = rel.split("/");
    const id = `${parts[2]}/${parts[3]!.replace(/\.json$/, "")}`;
    if (!active.has(id)) continue;
    try {
      const ev = JSON.parse(readFileSync(join(root, rel), "utf8")) as { kind?: string };
      if (ev.kind === "manual") out.push(`manual-evidence ${id}`);
    } catch {
      // a damaged file is a stale-evidence finding already
    }
  }
  return out.sort();
}
