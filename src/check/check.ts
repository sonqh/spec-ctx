// REQ-CHK-001 REQ-CHK-002 REQ-GOV-002 integrity rules over the index.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Config } from "../config.ts";
import { canon, SPEC_KINDS } from "../index/canonical.ts";
import { changeKey } from "../index/scan.ts";
import type { Index, Problem } from "../index/types.ts";
import { listEvidence } from "../tasks/evidence.ts";
import { cmpTuple } from "../util/pystr.ts";
import { evidenceFindings } from "./evidence.ts";

const RETIRED_RE = /\b(REQ-[A-Z]{2,6}-\d{3}|ADR-\d{3})\b/g;
const REQ_CAP = /^REQ-([A-Z]{2,6})-/;

export function retiredIds(root: string): Set<string> {
  const p = join(root, "decisions", "retired-ids.md");
  if (!existsSync(p)) return new Set();
  // REQ-GOV-002 the retired ID is the first ID of a line. A reason may name the replacement ID, which stays live.
  const out = new Set<string>();
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = new RegExp(RETIRED_RE.source).exec(line);
    if (m) out.add(m[1]!);
  }
  return out;
}

/**
 * REQ-CHK-004 two change folders, active or archived, with one key are a hard finding.
 * The first folder in path order keeps the key. Every later folder gets a finding.
 */
export function duplicateChangeKeys(root: string): Problem[] {
  const base = join(root, "openspec/changes");
  const dirs = (abs: string): string[] => {
    if (!existsSync(abs)) return [];
    return readdirSync(abs).filter((n) => statSync(join(abs, n)).isDirectory()).sort();
  };
  const folders: [string, string][] = [];
  for (const n of dirs(base)) if (n !== "archive") folders.push([`openspec/changes/${n}`, n]);
  // openspec archive prefixes the folder with a date: 2026-10-23-001-foundation
  for (const n of dirs(join(base, "archive"))) folders.push([`openspec/changes/archive/${n}`, n.replace(/^\d{4}-\d{2}-\d{2}-/, "")]);
  const seen = new Set<string>();
  const out: Problem[] = [];
  for (const [rel, name] of folders.sort((a, b) => cmpTuple(a, b))) {
    const key = changeKey(name);
    if (seen.has(key)) out.push([rel, 1, "duplicate-change-key", key]);
    seen.add(key);
  }
  return out;
}

export interface Finding {
  file: string;
  line: number;
  rule: string;
  id: string;
}

/** Sorted, unique findings. The scan never reads .ctx/, so evidence adds no index entry. */
export function check(root: string, cfg: Config, data: Index, strict: boolean): Finding[] {
  const entries = data.entries;
  const findings: Problem[] = data.problems.map((p) => [...p] as Problem);
  findings.push(...duplicateChangeKeys(root));
  const seen = new Set<string>();
  for (const e of entries) {
    if (!SPEC_KINDS.has(e.kind)) continue;
    // archived folders keep a copy of main specs. A MODIFIED or REMOVED block is a pending edit of one.
    if (e.status === "archived" || e.status === "modified" || e.status === "removed") continue;
    if (seen.has(e.id)) findings.push([e.file, e.line, "duplicate-id", e.id]);
    seen.add(e.id);
  }
  const known = new Set(entries.filter((e) => ["req", "scn", "adr", "task"].includes(e.kind)).map((e) => e.id));
  const ids = canon(entries);
  const retired = retiredIds(root);
  const caps = new Set(cfg.ids.caps);
  for (const e of entries) {
    if ((e.kind === "req" || e.kind === "adr") && retired.has(e.id) && e.status !== "archived") {
      findings.push([e.file, e.line, "reused-id", e.id]);
    }
    for (const r of e.refs) {
      if (!known.has(r)) {
        if (e.kind === "task" && !strict) continue;
        findings.push([e.file, e.line, e.kind === "task" ? "unknown-task-req" : "dangling-ref", r]);
      } else if (e.kind === "code" && (!ids.has(r) || ids.get(r)!.status === "archived")) {
        // the tag points at a requirement that lives only in an archived change
        findings.push([e.file, e.line, "code-tag-no-canonical", r]);
      }
    }
    // an archived block is history. An archived REMOVED block has no scenario by design.
    if (e.kind === "req" && e.status !== "removed" && e.status !== "archived" && !(e.scenarios ?? []).length) {
      findings.push([e.file, e.line, "req-without-scn", e.id]);
    }
    if (caps.size && e.kind === "req" && e.status !== "archived") {
      const m = REQ_CAP.exec(e.id);
      if (m && !caps.has(m[1]!)) findings.push([e.file, e.line, "unknown-cap", e.id]);
    }
  }
  if (strict) {
    const covered = new Set(entries.filter((e) => e.kind === "test").flatMap((e) => e.refs));
    const named = new Set(data.scn_named ?? []);
    // an ID that a REMOVED block of an active change names waits for archive, so it needs no test
    const pending = new Set<string>();
    for (const e of entries) {
      if (e.status !== "removed") continue;
      pending.add(e.id);
      for (const s of e.scenarios ?? []) pending.add(s);
    }
    const scnOf = new Map(entries.filter((e) => e.kind === "req").flatMap((e) => (e.scenarios ?? []).map((s) => [s, e.id] as const)));
    for (const e of entries) {
      if (e.change !== "main" || e.status !== "active") continue;
      if (pending.has(e.id) || (e.kind === "scn" && pending.has(scnOf.get(e.id) ?? ""))) continue;
      if (e.kind === "req" && !covered.has(e.id)) findings.push([e.file, e.line, "uncovered", e.id]);
      if (e.kind === "scn" && !named.has(e.id)) findings.push([e.file, e.line, "scenario-untested", e.id]);
    }
    findings.push(...evidenceFindings(root, entries, listEvidence(root)));
  }
  const uniq = new Map<string, Problem>();
  for (const f of findings) uniq.set(JSON.stringify(f), f);
  return [...uniq.values()].sort((a, b) => cmpTuple(a, b)).map(([file, line, rule, id]) => ({ file, line, rule, id }));
}
