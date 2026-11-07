// REQ-STAT-009 REQ-STAT-010 the file of the day keeps its old rows, and the README total row follows the file.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface DayFile {
  /** the change rows as the file writes them, by change name */
  rows: Map<string, string>;
  /** the three gate rows as written, or null when the file has none */
  gate: string[] | null;
  gateRuns: number;
  specChars: number | null;
}

const GATE_KEYS = ["gate_runs", "gate_pass_rate", "gate_failures_caught"];

/** The parsed file of a day, or null when no file exists. */
export function readDay(root: string, rel: string): DayFile | null {
  const p = join(root, rel);
  if (!existsSync(p)) return null;
  const rows = new Map<string, string>();
  const gate: string[] = [];
  let gateRuns = 0;
  let specChars: number | null = null;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const cells = line.startsWith("| ") ? line.split("|").slice(1, -1).map((c) => c.trim()) : [];
    if (cells.length === 6 && cells[0] !== "change" && cells[0] !== "---" && cells[0] !== "total") rows.set(cells[0]!, line);
    if (cells.length === 2 && GATE_KEYS.includes(cells[0]!)) {
      gate.push(line);
      if (cells[0] === "gate_runs") gateRuns = Number.parseInt(cells[1]!, 10) || 0;
    }
    const m = /^The spec text in the index holds (\d+) characters\./.exec(line);
    if (m) specChars = Number(m[1]);
  }
  return { rows, gate: gate.length === GATE_KEYS.length ? gate : null, gateRuns, specChars };
}

/** The README `## Measured` section takes the path and the total row. It needs all three anchors, else nothing changes. `missing` names an absent anchor of a README that has the section. */
export function setReadmeTotal(root: string, rel: string, totalRow: string): { changed: boolean; missing?: string } {
  const p = join(root, "README.md");
  if (!existsSync(p)) return { changed: false };
  const text = readFileSync(p, "utf8");
  const lines = text.split("\n");
  const at = lines.findIndex((l) => l === "## Measured");
  if (at < 0) return { changed: false };
  let end = lines.findIndex((l, i) => i > at && l.startsWith("## "));
  if (end < 0) end = lines.length;
  const pathAt = lines.findIndex((l, i) => i > at && i < end && l.startsWith("The newest file is"));
  const rowAt = lines.findIndex((l, i) => i > at && i < end && l.startsWith("| total |"));
  if (pathAt < 0) return { changed: false, missing: "line that starts The newest file is" };
  if (rowAt < 0) return { changed: false, missing: "| total | row" };
  lines[pathAt] = lines[pathAt]!.replace(/`docs\/metrics\/[^`]*`/, `\`${rel}\``);
  lines[rowAt] = totalRow;
  const next = lines.join("\n");
  if (next === text) return { changed: false };
  writeFileSync(p, next);
  return { changed: true };
}
