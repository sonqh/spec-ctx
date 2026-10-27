// REQ-ADOPT-007 hard lint findings per file and rule on the gate globs. One count per key, so the baseline survives line shifts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { markdownFiles } from "../cli/gate.ts";
import { lintSte } from "./ste.ts";
import { lintTells } from "./tells.ts";

/** Rules that the gate never counts. The repo lints by hand with the same disable. */
const SKIP = new Set(["synonym-rotation"]);

export const LINT_PREFIX = "lint ";

/** Key of one lint count: `lint <file> <linter>:<rule>`. */
export const lintKey = (file: string, linter: "tells" | "ste", rule: string): string => `${LINT_PREFIX}${file} ${linter}:${rule}`;

/** Hard findings per `lint <file> <linter>:<rule>` for the markdown globs. Files with no hard finding give no key. */
export function lintCounts(root: string, globs: string): { counts: Map<string, number>; files: number } {
  const counts = new Map<string, number>();
  const files = markdownFiles(root, globs);
  for (const f of files) {
    const text = readFileSync(join(root, f), "utf8").replace(/\r\n?/g, "\n");
    for (const x of lintTells(text)) {
      if (x.level !== "hard") continue;
      const k = lintKey(f, "tells", x.rule);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    for (const x of lintSte(text, f).findings) {
      if (x.level !== "advisory-free" || SKIP.has(x.rule)) continue;
      const k = lintKey(f, "ste", x.rule);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return { counts, files: files.length };
}

/** Parse a baseline line `lint <file> <rule> <count>`. Returns null for any other line. */
export function parseLintLine(line: string): { key: string; count: number } | null {
  if (!line.startsWith(LINT_PREFIX)) return null;
  const i = line.lastIndexOf(" ");
  const n = Number(line.slice(i + 1));
  if (i < 0 || !Number.isInteger(n) || n < 0) return null;
  return { key: line.slice(0, i), count: n };
}

export const lintLine = (key: string, count: number): string => `${key} ${count}`;

export interface LintRise {
  key: string;
  current: number;
  baseline: number;
}

/** REQ-CLI-004 the keys whose count rose above the baseline, worst first. A key with no line has a baseline of 0. */
export function lintRises(counts: Map<string, number>, baseline: Set<string> | null): LintRise[] {
  const base = new Map<string, number>();
  for (const line of baseline ?? []) {
    const p = parseLintLine(line);
    if (p) base.set(p.key, p.count);
  }
  const out: LintRise[] = [];
  for (const [key, current] of counts) {
    const b = base.get(key) ?? 0;
    if (current > b) out.push({ key, current, baseline: b });
  }
  out.sort((a, b) => b.current - b.baseline - (a.current - a.baseline) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return out;
}
