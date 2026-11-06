// REQ-JRN-001 REQ-JRN-002 the sink that main() fills. It has no fs import, so a --version run loads no write code (057/D1).
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** REQ-JRN-002 the closed set of signals. The line version `v` versions it. */
export const SIGNALS = ["init-ok", "context-has-code-or-test", "empty-context", "truncated-context", "usage-error", "internal-error"] as const;
export type Signal = (typeof SIGNALS)[number];

export interface JournalErr {
  name: string;
  code: string | null;
  frames: string[];
}

export interface JournalSink {
  root?: string;
  cmd?: string;
  run?: string;
  signals: Set<string>;
  err?: JournalErr;
}

export interface NotePatch {
  root?: string;
  cmd?: string;
  run?: string;
  signal?: Signal;
  err?: JournalErr;
}

/** REQ-JRN-001 fill the sink. It does nothing when the caller passed no sink. */
export function note(io: { journal?: JournalSink }, patch: NotePatch): void {
  const s = io.journal;
  if (!s) return;
  if (patch.root !== undefined) s.root = patch.root;
  if (patch.cmd !== undefined) s.cmd = patch.cmd;
  if (patch.run !== undefined) s.run = patch.run;
  if (patch.signal !== undefined && (SIGNALS as readonly string[]).includes(patch.signal)) s.signals.add(patch.signal);
  if (patch.err !== undefined) s.err = patch.err;
}

/** The package root: two folders above src/journal or dist/journal. */
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** REQ-JRN-002 name, code, and package frames of an error. Never the message (057/D4). */
export function errInfo(e: unknown, pkgRoot = PACKAGE_ROOT): JournalErr {
  if (!(e instanceof Error)) return { name: "NonError", code: null, frames: [] };
  const raw = (e as { code?: unknown }).code;
  const code = typeof raw === "string" && /^[A-Z][A-Z0-9_]*$/.test(raw) ? raw : null;
  const frames: string[] = [];
  // stack line 1 holds the message, so it never counts
  for (const line of (e.stack ?? "").split("\n").slice(1)) {
    if (!/^\s+at /.test(line)) continue;
    const m = /\(?((?:file:\/\/)?[^()\s]+):(\d+):\d+\)?$/.exec(line);
    if (!m) continue;
    let file = m[1]!;
    try {
      if (file.startsWith("file://")) file = fileURLToPath(file);
    } catch {
      continue;
    }
    // REQ-JRN-007 a frame like node:internal/... or <anonymous> is no path in the package
    if (!isAbsolute(file)) continue;
    const rel = relative(pkgRoot, file);
    if (rel === "" || rel.startsWith("..") || rel.split(/[\\/]/).includes("node_modules") || resolve(rel) === rel) continue;
    frames.push(`${rel.split("\\").join("/")}:${m[2]}`);
    if (frames.length === 10) break;
  }
  return { name: e.name, code, frames };
}

