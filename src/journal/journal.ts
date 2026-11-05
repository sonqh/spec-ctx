// REQ-JRN-001 REQ-JRN-003 the journal write. One call, one line, no output, no throw (057/D2, 057/D3).
import { appendFileSync, existsSync, mkdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { COMMANDS } from "../cli/args.ts";
import { dumps } from "../util/json.ts";
import { SIGNALS, type JournalSink } from "./note.ts";

export const JOURNAL_DIR = ".ctx/local";
export const JOURNAL_FILE = "runs.jsonl";
export const ROTATED_FILE = "runs.1.jsonl";
export const MAX_BYTES = 256 * 1024;
export const MAX_LINE = 4096;

/** REQ-JRN-001 the line, with sorted keys and no newline inside. It stays under 4 KB. */
export function journalLine(sink: JournalSink, run: { exit: number; ms: number; version: string; at?: string }): string {
  const signals = new Set(sink.signals);
  if (run.exit === 2) signals.add("usage-error");
  if (run.exit === 3) signals.add("internal-error");
  const rec: Record<string, unknown> = {
    at: run.at ?? new Date().toISOString(),
    cmd: sink.cmd !== undefined && COMMANDS.includes(sink.cmd) ? sink.cmd : "?",
    exit: run.exit,
    ms: Math.max(0, Math.round(run.ms)),
    signals: SIGNALS.filter((s) => signals.has(s)),
    v: 1,
    version: run.version,
  };
  if (sink.err && run.exit === 3) rec.err = { code: sink.err.code, frames: sink.err.frames, name: sink.err.name };
  let line = JSON.stringify(JSON.parse(dumps(rec)));
  if (line.length > MAX_LINE && sink.err) {
    rec.err = { code: sink.err.code, frames: sink.err.frames.slice(0, 5), name: sink.err.name };
    line = JSON.stringify(JSON.parse(dumps(rec)));
  }
  if (line.length > MAX_LINE) {
    delete rec.err;
    line = JSON.stringify(JSON.parse(dumps(rec)));
  }
  return line;
}

/** REQ-JRN-003 append one line. Any failure stays silent. */
export function appendRun(sink: JournalSink, run: { exit: number; ms: number; version: string; at?: string }): void {
  try {
    if (process.env.SPECCTX_JOURNAL === "0") return;
    const root = sink.root;
    if (!root) return;
    const os = join(root, "openspec");
    if (!existsSync(os) || !statSync(os).isDirectory()) return;
    const dir = join(root, JOURNAL_DIR);
    mkdirSync(dir, { recursive: true });
    const ignore = join(dir, ".gitignore");
    if (!existsSync(ignore)) writeFileSync(ignore, "*\n");
    const file = join(dir, JOURNAL_FILE);
    if (existsSync(file) && statSync(file).size > MAX_BYTES) renameSync(file, join(dir, ROTATED_FILE));
    appendFileSync(file, journalLine(sink, run) + "\n");
  } catch {
    // the journal never changes the exit code or the output
  }
}
