// REQ-JRN-004 REQ-JRN-005 the bug report. The only reader of the journal. It never runs gh and never uses the network (057/D6).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "smol-toml";
import { JOURNAL_DIR, JOURNAL_FILE, ROTATED_FILE } from "./journal.ts";
import { SIGNALS } from "./note.ts";

export interface SystemInfo {
  version: string;
  node: string;
  platform: string;
  arch: string;
}

interface Line {
  at: string;
  cmd: string;
  exit: number;
  ms: number;
  signals: string[];
  err?: { name: string; code: string | null; frames: string[] };
}

export const NO_JOURNAL = `no journal found under ${JOURNAL_DIR}\n`;

function readLines(path: string): Line[] {
  if (!existsSync(path)) return [];
  const out: Line[] = [];
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    if (!raw.trim()) continue;
    try {
      const v = JSON.parse(raw) as Record<string, unknown>;
      if (v === null || typeof v !== "object" || v.v !== 1) continue;
      if (typeof v.at !== "string" || Number.isNaN(Date.parse(v.at)) || typeof v.cmd !== "string") continue;
      if (typeof v.exit !== "number" || typeof v.ms !== "number" || !Array.isArray(v.signals)) continue;
      const line: Line = { at: v.at, cmd: v.cmd, exit: v.exit, ms: v.ms, signals: v.signals.filter((s): s is string => typeof s === "string") };
      const e = v.err as Record<string, unknown> | undefined;
      if (e && typeof e === "object") {
        line.err = {
          name: typeof e.name === "string" && /^\w+$/.test(e.name) ? e.name : "?",
          code: typeof e.code === "string" && /^[A-Z][A-Z0-9_]*$/.test(e.code) ? e.code : null,
          frames: Array.isArray(e.frames) ? e.frames.filter((f): f is string => typeof f === "string" && /^[\w./-]+:\d+$/.test(f)) : [],
        };
      }
      out.push(line);
    } catch {
      // a line that is not JSON is skipped
    }
  }
  return out;
}

/** REQ-JRN-004 section and key names of spec-ctx.toml, with no value. */
export function configShape(root: string): string[] {
  const path = join(root, "spec-ctx.toml");
  if (!existsSync(path)) return ["none (no spec-ctx.toml)"];
  let doc: Record<string, unknown>;
  try {
    doc = parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch {
    return ["none (spec-ctx.toml does not parse)"];
  }
  const rows: string[] = [];
  const top = Object.keys(doc).filter((k) => !isTable(doc[k]));
  if (top.length) rows.push(`(top level): ${top.join(", ")}`);
  const walk = (name: string, t: Record<string, unknown>): void => {
    const keys = Object.keys(t).filter((k) => !isTable(t[k]));
    rows.push(`[${name}]: ${keys.length ? keys.join(", ") : "no keys"}`);
    for (const k of Object.keys(t)) if (isTable(t[k])) walk(`${name}.${k}`, t[k] as Record<string, unknown>);
  };
  for (const k of Object.keys(doc)) if (isTable(doc[k])) walk(k, doc[k] as Record<string, unknown>);
  return rows.length ? rows : ["none (empty file)"];
}

function isTable(v: unknown): boolean {
  return v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
}

/** Nearest rank. */
export function p95(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil(0.95 * s.length) - 1)]!;
}

/** REQ-JRN-004 the Markdown report. It is a pure function of the journal files and the config. */
export function buildReport(root: string, now: Date, sys: SystemInfo): { found: boolean; text: string } {
  const dir = join(root, JOURNAL_DIR);
  if (!existsSync(join(dir, JOURNAL_FILE)) && !existsSync(join(dir, ROTATED_FILE))) return { found: false, text: NO_JOURNAL };
  const lines = [...readLines(join(dir, ROTATED_FILE)), ...readLines(join(dir, JOURNAL_FILE))];
  const md: string[] = ["# spec-ctx report", "", `Generated: ${now.toISOString()}`, ""];
  md.push("## Versions", "", `- spec-ctx: ${sys.version}`, `- Node: ${sys.node}`, `- OS: ${sys.platform} ${sys.arch}`, "");
  md.push("## Config shape", "", ...configShape(root).map((r) => `- ${r}`), "");
  const i = lines.findIndex((l) => l.signals.includes("init-ok"));
  const j = i < 0 ? -1 : lines.findIndex((l, k) => k > i && l.signals.includes("context-has-code-or-test"));
  md.push("## North star", "");
  if (j < 0) md.push("- Minutes from the first `init-ok` to the first `context-has-code-or-test`: n/a", "- Runs between them: n/a", "");
  else {
    const mins = (Date.parse(lines[j]!.at) - Date.parse(lines[i]!.at)) / 60000;
    md.push(`- Minutes from the first \`init-ok\` to the first \`context-has-code-or-test\`: ${mins.toFixed(1)}`, `- Runs between them: ${j - i}`, "");
  }
  md.push(`## Runs`, "", `- Total: ${lines.length}`, "");
  const byCmd = new Map<string, number[]>();
  for (const l of lines) byCmd.set(l.cmd, [...(byCmd.get(l.cmd) ?? []), l.ms]);
  md.push("## Time", "", "| cmd | runs | p95 ms |", "| --- | --- | --- |");
  for (const c of [...byCmd.keys()].sort()) md.push(`| ${c.replace(/[^\w ?-]/g, "?")} | ${byCmd.get(c)!.length} | ${p95(byCmd.get(c)!)} |`);
  md.push("", "## Signals", "");
  for (const s of SIGNALS) md.push(`- ${s}: ${lines.filter((l) => l.signals.includes(s)).length}`);
  md.push("", "## Last internal error", "");
  const last = [...lines].reverse().find((l) => l.err !== undefined);
  if (!last?.err) md.push("- none");
  else {
    md.push(`- name: ${last.err.name}`, `- code: ${last.err.code ?? "none"}`, "- frames:", ...last.err.frames.map((f) => `  - ${f}`));
    if (!last.err.frames.length) md.push("  - none");
  }
  md.push("", "Review this text, then file it. Run: `gh issue create -R sonqh/spec-ctx --body-file <file>`", "");
  return { found: true, text: md.join("\n") };
}
