// REQ-CHK-003 evidence rules of check --strict.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Entry, Problem } from "../index/types.ts";
import { fileSha256 } from "../util/hash.ts";

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
    let files: Record<string, string> = {};
    try {
      const ev = JSON.parse(readFileSync(join(root, rel), "utf8")) as { files?: Record<string, string> };
      files = ev.files ?? {};
    } catch {
      out.push([rel, 1, "stale-evidence", `${id} ${rel}`]);
      continue;
    }
    for (const [path, digest] of Object.entries(files)) {
      if (fileSha256(join(root, path)) !== digest) out.push([rel, 1, "stale-evidence", `${id} ${path}`]);
    }
  }
  for (const e of entries) {
    if (e.kind === "task" && e.status === "done" && !e.file.includes("/archive/") && !have.has(e.id)) {
      out.push([e.file, e.line, "done-without-evidence", e.id]);
    }
  }
  return out;
}
