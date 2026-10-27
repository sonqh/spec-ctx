// REQ-ADOPT-005 REQ-CHK-002 the baseline ratchet in .ctx/baseline.json: sorted "rule id" pairs.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Finding } from "../check/check.ts";
import { lintLine, parseLintLine } from "../lint/counts.ts";
import { cmpStr } from "../util/pystr.ts";

export const BASELINE_PATH = ".ctx/baseline.json";
export const BASELINE_RULES = ["uncovered", "scenario-untested", "done-without-evidence", "manual-evidence", "task-without-req", "task-without-verify", "missing-id"];

/** REQ-ADOPT-005 a missing-id finding has no ID. Its key carries the file and the header title. */
const key = (f: Pick<Finding, "rule" | "id" | "file">): string => (f.rule === "missing-id" ? `${f.rule} ${f.file} ${f.id}` : `${f.rule} ${f.id}`);
/** A warning line reads "manual-evidence <task>". */
const warningKey = (w: string): string => w;

export function readBaseline(root: string): Set<string> | null {
  const p = join(root, BASELINE_PATH);
  if (!existsSync(p)) return null;
  const v = JSON.parse(readFileSync(p, "utf8")) as unknown;
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) throw new Error(`${BASELINE_PATH} must be a JSON list of "rule id" strings`);
  return new Set(v as string[]);
}

function save(root: string, entries: Iterable<string>): string[] {
  const list = [...new Set(entries)].sort(cmpStr);
  mkdirSync(join(root, ".ctx"), { recursive: true });
  writeFileSync(join(root, BASELINE_PATH), JSON.stringify(list, null, 2) + "\n");
  return list;
}

/** The current debt that the baseline may hold: strict findings and warnings of the listed rules. */
export function debt(findings: Finding[], warnings: string[]): string[] {
  const out = findings.filter((f) => BASELINE_RULES.includes(f.rule)).map((f) => key(f));
  for (const w of warnings) if (BASELINE_RULES.includes(w.split(" ")[0]!)) out.push(warningKey(w));
  return out;
}

/** REQ-ADOPT-007 one `lint <file> <rule> <count>` line per key with hard lint findings. */
export function lintDebt(counts: Map<string, number>): string[] {
  return [...counts].filter(([, n]) => n > 0).map(([k, n]) => lintLine(k, n));
}

export function writeBaseline(root: string, findings: Finding[], warnings: string[], lint: Map<string, number> = new Map()): string[] {
  return save(root, [...debt(findings, warnings), ...lintDebt(lint)]);
}

/** Drop entries that no longer fire. Returns the number dropped. */
export function pruneBaseline(root: string, findings: Finding[], warnings: string[], lint: Map<string, number> = new Map()): number {
  const cur = readBaseline(root);
  if (!cur) return 0;
  const live = new Set(debt(findings, warnings));
  const kept: string[] = [];
  let pruned = 0;
  for (const e of cur) {
    const l = parseLintLine(e);
    if (l) {
      // REQ-ADOPT-007 a lint line drops at zero and lowers when the count fell
      const now = lint.get(l.key) ?? 0;
      if (now === 0) pruned++;
      else if (now < l.count) {
        pruned++;
        kept.push(lintLine(l.key, now));
      } else kept.push(e);
    } else if (live.has(e)) kept.push(e);
    else pruned++;
  }
  save(root, kept);
  return pruned;
}

export interface Filtered {
  findings: Finding[];
  warnings: string[];
  baselined: number;
}

/** REQ-CHK-002 a finding or warning in the baseline leaves the output and counts as baselined. */
export function applyBaseline(root: string, findings: Finding[], warnings: string[]): Filtered {
  const base = readBaseline(root);
  if (!base) return { findings, warnings, baselined: 0 };
  let n = 0;
  const f2 = findings.filter((f) => {
    const hit = base.has(key(f));
    if (hit) n++;
    return !hit;
  });
  const w2 = warnings.filter((w) => {
    const hit = base.has(warningKey(w));
    if (hit) n++;
    return !hit;
  });
  return { findings: f2, warnings: w2, baselined: n };
}
