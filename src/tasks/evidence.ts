// REQ-TASK-004 evidence files under .ctx/evidence/<change key>/<task>.json.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Entry } from "../index/types.ts";
import { fileSha256 } from "../util/hash.ts";
import { dumps } from "../util/json.ts";
import { isoNow } from "../util/time.ts";
import { VERSION } from "../version.ts";
import { evidenceRel, type Task } from "./tasks.ts";

export interface Evidence {
  task: string;
  reqs: string[];
  kind: "command" | "manual";
  verify: { command: string | null; exit: number | null; stdout_sha256: string | null; stderr_tail: string };
  files: Record<string, string>;
  at: string;
  tool_version: string;
  note?: string;
  bundle_chars?: number;
  started_at?: string;
  cwd?: string;
}

/** Digests of every code and test file tagged with one of the REQs. */
export function taggedFiles(root: string, entries: Entry[], reqs: string[]): Record<string, string> {
  const want = new Set(reqs);
  const paths = new Set<string>();
  for (const e of entries) {
    if ((e.kind === "code" || e.kind === "test") && e.refs.some((r) => want.has(r))) paths.add(e.file);
  }
  const out: Record<string, string> = {};
  for (const p of [...paths].sort()) {
    const d = fileSha256(join(root, p));
    if (d) out[p] = d;
  }
  return out;
}

export function writeEvidence(root: string, t: Task, entries: Entry[], verify: Evidence["verify"], kind: Evidence["kind"], note?: string, cwd?: string): string {
  const ev: Evidence = {
    task: t.id,
    reqs: [...t.reqs],
    kind,
    verify,
    files: taggedFiles(root, entries, t.reqs),
    at: isoNow(),
    tool_version: VERSION,
  };
  if (note !== undefined) ev.note = note;
  if (cwd !== undefined) ev.cwd = cwd;
  // REQ-STAT-002 copy the bundle size and the start time that task start wrote for this task
  try {
    const cur = JSON.parse(readFileSync(join(root, ".ctx/current.json"), "utf8")) as { task?: string; bundle_chars?: unknown; started_at?: unknown };
    if (cur.task === t.id) {
      if (typeof cur.bundle_chars === "number") ev.bundle_chars = cur.bundle_chars;
      if (typeof cur.started_at === "string") ev.started_at = cur.started_at;
    }
  } catch {
    // no current task
  }
  const rel = evidenceRel(t);
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), dumps(ev) + "\n");
  return rel;
}

/** Move the evidence of a reopened task to <task>.reopened-<n>.json. */
export function retireEvidence(root: string, t: Task, reason?: string): string | null {
  const rel = evidenceRel(t);
  const abs = join(root, rel);
  if (!existsSync(abs)) return null;
  const base = rel.slice(0, -".json".length);
  let n = 1;
  while (existsSync(join(root, `${base}.reopened-${n}.json`))) n++;
  const target = `${base}.reopened-${n}.json`;
  renameSync(abs, join(root, target));
  if (reason !== undefined) {
    // REQ-STAT-003 the reopen reason stays with the old evidence, so stats can count stale catches
    try {
      const ev = JSON.parse(readFileSync(join(root, target), "utf8")) as Record<string, unknown>;
      ev.reason = reason;
      writeFileSync(join(root, target), dumps(ev) + "\n");
    } catch {
      // a damaged file moves as it is
    }
  }
  return target;
}

/** REQ-LOOP-002 the file name pattern of a fail file. Every evidence reader skips it (024/D4). */
export const FAIL_RE = /\.fail-\d+\.json$/;

export const isFailFile = (name: string): boolean => FAIL_RE.test(name);

/** Every live evidence file, as a path relative to the root. Reopened copies and fail files are history and stay out. */
export function listEvidence(root: string): string[] {
  const dir = join(root, ".ctx/evidence");
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const c of readdirSync(dir).sort()) {
    let names: string[];
    try {
      names = readdirSync(join(dir, c));
    } catch {
      continue;
    }
    for (const n of names.sort()) {
      if (n.endsWith(".json") && !n.includes(".reopened-") && !isFailFile(n)) out.push(`.ctx/evidence/${c}/${n}`);
    }
  }
  return out;
}
