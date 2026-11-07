// REQ-STAT-005 REQ-STAT-009 REQ-STAT-010 stats --write: docs/metrics/<YYYY-MM-DD>.md by UTC date. A same day write keeps the old rows.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { today } from "../util/time.ts";
import { COLUMNS, type Stats } from "./stats.ts";
import { type DayFile, readDay, setReadmeTotal } from "./merge.ts";
import { cmpStr } from "../util/pystr.ts";

export const dayPath = (date: string): string => `docs/metrics/${date}.md`;

/** The spec text size of the file of today, so a same day write uses one denominator (067/D5). Null when no file exists. */
export function dayChars(root: string): number | null {
  return readDay(root, dayPath(today()))?.specChars ?? null;
}

export function statsMarkdown(s: Stats, date: string, prev: DayFile | null = null): string {
  // the three gate rows change as one set, and only when the log holds at least as many runs as the file
  const keepGate = prev?.gate && (s.gate.gate_runs.value ?? 0) < prev.gateRuns ? prev.gate : null;
  const out = [
    `# Metrics ${date}`,
    "",
    "`specctx stats --write` wrote this file. Each value carries the count of its inputs. A value without inputs reads n/a.",
    "",
    `| change | ${COLUMNS.join(" | ")} |`,
    `| --- | ${COLUMNS.map(() => "---").join(" | ")} |`,
  ];
  const line = (r: Stats["total"]): string => `| ${r.change} | ${COLUMNS.map((c) => r[c].text).join(" | ")} |`;
  // REQ-STAT-009 the rows of the file and the rows of this run, in change order. A stored row wins.
  const fresh = new Map(s.rows.map((r) => [r.change, r] as const));
  const names = [...new Set([...(prev?.rows.keys() ?? []), ...fresh.keys()])].sort(cmpStr);
  for (const n of names) out.push(prev?.rows.get(n) ?? line(fresh.get(n)!));
  out.push(line(s.total));
  out.push(
    "",
    "| gate metric | value |",
    "| --- | --- |",
    ...(keepGate ?? [
      `| gate_runs | ${s.gate.gate_runs.text} |`,
      `| gate_pass_rate | ${s.gate.gate_pass_rate.text} |`,
      `| gate_failures_caught | ${s.gate.gate_failures_caught.text} |`,
    ]),
    "",
    `The spec text in the index holds ${s.spec_chars} characters. The context ratio divides each bundle by that size.`,
  );
  return out.join("\n") + "\n";
}

/**
 * `readme` is false under `--change`, because the README total row is the total of the whole repository.
 * `note` gets one line when the README has `## Measured` and lacks an anchor.
 */
export function writeStats(root: string, s: Stats, readme = true, note: (m: string) => void = () => {}): string {
  const date = today();
  const rel = `docs/metrics/${date}.md`;
  mkdirSync(join(root, "docs/metrics"), { recursive: true });
  const md = statsMarkdown(s, date, readDay(root, rel));
  writeFileSync(join(root, rel), md);
  // REQ-STAT-010 the README total row follows the file
  const total = md.split("\n").find((l) => l.startsWith("| total |"));
  if (total && readme) {
    const r = setReadmeTotal(root, rel, total);
    if (r.missing) note(`README.md has ## Measured but no ${r.missing}. The total row stays.\n`);
  }
  return rel;
}
