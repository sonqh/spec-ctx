// REQ-STAT-005 stats --write: docs/metrics/<YYYY-MM-DD>.md by UTC date, overwritten on the same day.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { today } from "../util/time.ts";
import { COLUMNS, type Stats } from "./stats.ts";

export function statsMarkdown(s: Stats, date: string): string {
  const out = [
    `# Metrics ${date}`,
    "",
    "`specctx stats --write` wrote this file. Each value carries the count of its inputs. A value without inputs reads n/a.",
    "",
    `| change | ${COLUMNS.join(" | ")} |`,
    `| --- | ${COLUMNS.map(() => "---").join(" | ")} |`,
  ];
  for (const r of [...s.rows, s.total]) out.push(`| ${r.change} | ${COLUMNS.map((c) => r[c].text).join(" | ")} |`);
  out.push(
    "",
    "| gate metric | value |",
    "| --- | --- |",
    `| gate_runs | ${s.gate.gate_runs.text} |`,
    `| gate_pass_rate | ${s.gate.gate_pass_rate.text} |`,
    `| gate_failures_caught | ${s.gate.gate_failures_caught.text} |`,
    "",
    `The spec text in the index holds ${s.spec_chars} characters. The context ratio divides each bundle by that size.`,
  );
  return out.join("\n") + "\n";
}

export function writeStats(root: string, s: Stats): string {
  const date = today();
  const rel = `docs/metrics/${date}.md`;
  mkdirSync(join(root, "docs/metrics"), { recursive: true });
  writeFileSync(join(root, rel), statsMarkdown(s, date));
  return rel;
}
