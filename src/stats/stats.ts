// REQ-STAT-001 REQ-STAT-002 REQ-STAT-003 REQ-STAT-004 REQ-STAT-005 five metrics from files that exist, plus the gate log.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readBaseline } from "../baseline/baseline.ts";
import type { Finding } from "../check/check.ts";
import { changeNum } from "../index/scan.ts";
import type { Entry } from "../index/types.ts";
import { cmpStr, cpLen } from "../util/pystr.ts";

export const DEBT_RULES = ["uncovered", "scenario-untested", "done-without-evidence", "manual-evidence"];

interface Ev {
  task: string;
  kind: string;
  at: string;
  bundle_chars?: number;
  started_at?: string;
  reason?: string;
}

export interface Metric {
  /** null prints as n/a */
  value: number | null;
  n: number;
  text: string;
  tasks?: string[];
}

export interface Row {
  change: string;
  context_ratio: Metric;
  evidence_ratio: Metric;
  stale_catches: Metric;
  cycle_time_median_s: Metric;
  debt: Metric;
}

export interface Gate {
  gate_runs: Metric;
  gate_pass_rate: Metric;
  gate_failures_caught: Metric;
}

export interface Stats {
  spec_chars: number;
  rows: Row[];
  total: Row;
  gate: Gate;
}

const NA = (n = 0): Metric => ({ value: null, n, text: "n/a" });

function readEvidence(root: string): { live: Ev[]; reopened: Ev[] } {
  const dir = join(root, ".ctx/evidence");
  const live: Ev[] = [];
  const reopened: Ev[] = [];
  if (!existsSync(dir)) return { live, reopened };
  for (const c of readdirSync(dir).sort(cmpStr)) {
    let names: string[];
    try {
      names = readdirSync(join(dir, c)).sort(cmpStr);
    } catch {
      continue;
    }
    for (const n of names) {
      if (!n.endsWith(".json")) continue;
      try {
        const ev = JSON.parse(readFileSync(join(dir, c, n), "utf8")) as Ev;
        if (typeof ev.task !== "string") continue;
        (n.includes(".reopened-") ? reopened : live).push(ev);
      } catch {
        // a damaged file is a check finding
      }
    }
  }
  return { live, reopened };
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2);
}

const fmt = (x: number, d = 2): string => x.toFixed(d);

function metrics(change: string, live: Ev[], reopened: Ev[], specChars: number, debt: Metric): Row {
  const withB = live.filter((e) => typeof e.bundle_chars === "number");
  const ctx: Metric = withB.length && specChars > 0
    ? (() => {
      const v = withB.reduce((a, e) => a + e.bundle_chars! / specChars, 0) / withB.length;
      return { value: v, n: withB.length, text: `${fmt(v, 4)} (n=${withB.length})` };
    })()
    : NA();
  const cmd = live.filter((e) => e.kind === "command");
  const ev: Metric = live.length
    ? { value: cmd.length / live.length, n: live.length, text: `${fmt(cmd.length / live.length)} (${cmd.length}/${live.length})`, tasks: cmd.map((e) => e.task).sort(cmpStr) }
    : NA();
  const stale = reopened.filter((e) => typeof e.reason === "string" && e.reason.includes("stale"));
  const st: Metric = reopened.length
    ? { value: stale.length, n: reopened.length, text: `${stale.length} (of ${reopened.length} reopens)`, tasks: stale.map((e) => e.task).sort(cmpStr) }
    : NA();
  const cycles = live
    .filter((e) => typeof e.started_at === "string" && typeof e.at === "string")
    .map((e) => Math.round((Date.parse(e.at) - Date.parse(e.started_at!)) / 1000))
    .filter((x) => Number.isFinite(x) && x >= 0);
  const med = median(cycles);
  const cyc: Metric = med === null ? NA() : { value: med, n: cycles.length, text: `${med} (n=${cycles.length})` };
  return { change, context_ratio: ctx, evidence_ratio: ev, stale_catches: st, cycle_time_median_s: cyc, debt };
}

/** REQ-STAT-005 gate metrics over the last 100 lines of the gate log. */
export function gateMetrics(root: string, last = 100): Gate {
  const p = join(root, ".ctx/gate-log.jsonl");
  if (!existsSync(p)) return { gate_runs: NA(), gate_pass_rate: NA(), gate_failures_caught: NA() };
  const lines = readFileSync(p, "utf8").split("\n").filter(Boolean).slice(-last);
  const runs = lines.flatMap((l) => {
    try {
      return [JSON.parse(l) as { ok?: unknown }];
    } catch {
      return [];
    }
  });
  if (!runs.length) return { gate_runs: NA(), gate_pass_rate: NA(), gate_failures_caught: NA() };
  const ok = runs.filter((r) => r.ok === true).length;
  const failed = runs.length - ok;
  return {
    gate_runs: { value: runs.length, n: runs.length, text: String(runs.length) },
    gate_pass_rate: { value: ok / runs.length, n: runs.length, text: `${fmt(ok / runs.length)} (${ok}/${runs.length})` },
    gate_failures_caught: { value: failed, n: runs.length, text: String(failed) },
  };
}

export function computeStats(root: string, entries: Entry[], strictFindings: Finding[], warnings: string[], only?: string): Stats {
  const specChars = entries
    .filter((e) => e.canonical && (e.kind === "req" || e.kind === "scn" || e.kind === "decision"))
    .reduce((a, e) => a + cpLen(e.text ?? ""), 0);
  const { live, reopened } = readEvidence(root);
  // the change name of each change number, from the task entries
  const names = new Map<string, string>();
  for (const e of entries) if (e.kind === "task") names.set(changeNum(e.change), e.change);
  const nameOf = (task: string): string => {
    const num = task.split("/")[0]!;
    return names.get(num) ?? num;
  };
  // REQ-STAT-004 debt: baseline entries plus current debt findings and warnings outside the baseline
  const base = readBaseline(root) ?? new Set<string>();
  const current = [
    ...strictFindings.filter((f) => DEBT_RULES.includes(f.rule)).map((f) => `${f.rule} ${f.id}`),
    ...warnings.filter((w) => DEBT_RULES.includes(w.split(" ")[0]!)),
  ];
  const fresh = [...new Set(current)].filter((k) => !base.has(k));
  const debtAll: Metric = { value: base.size + fresh.length, n: base.size + fresh.length, text: `${base.size + fresh.length} (${base.size} baselined + ${fresh.length} new)` };
  // a change row counts the task scoped debt: tasks without evidence and tasks with manual evidence
  const taskDebt = (change: string): Metric => {
    const keys = [...base, ...fresh].filter((k) => {
      const [rule, id] = k.split(" ");
      return (rule === "done-without-evidence" || rule === "manual-evidence") && nameOf(id ?? "") === change;
    });
    return { value: keys.length, n: keys.length, text: String(keys.length) };
  };
  const changes = [...new Set([...live, ...reopened].map((e) => nameOf(e.task)))].sort(cmpStr).filter((c) => !only || c === only || changeNum(c) === only);
  const rows = changes.map((c) => metrics(c, live.filter((e) => nameOf(e.task) === c), reopened.filter((e) => nameOf(e.task) === c), specChars, taskDebt(c)));
  const pick = (xs: Ev[]): Ev[] => (only ? xs.filter((e) => changes.includes(nameOf(e.task))) : xs);
  const total = metrics("total", pick(live), pick(reopened), specChars, debtAll);
  return { spec_chars: specChars, rows, total, gate: gateMetrics(root) };
}

export const COLUMNS = ["context_ratio", "evidence_ratio", "stale_catches", "cycle_time_median_s", "debt"] as const;

export function statsTable(s: Stats): string[] {
  const head = ["change", ...COLUMNS];
  const body = [...s.rows, s.total].map((r) => [r.change, ...COLUMNS.map((c) => r[c].text)]);
  const width = head.map((h, i) => Math.max(cpLen(h), ...body.map((b) => cpLen(b[i]!))));
  const line = (cells: string[]): string => cells.map((c, i) => (i === cells.length - 1 ? c : c + " ".repeat(width[i]! - cpLen(c)))).join("  ");
  const out = [line(head), ...body.map(line)];
  out.push(`gate_runs ${s.gate.gate_runs.text}`, `gate_pass_rate ${s.gate.gate_pass_rate.text}`, `gate_failures_caught ${s.gate.gate_failures_caught.text}`);
  return out;
}
