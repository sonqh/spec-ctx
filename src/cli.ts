#!/usr/bin/env node
// REQ-CLI-001 bin entry. tests call main() from src/main.ts in process.
// REQ-JRN-001 this entry writes the run journal after main() returns. main() only fills the sink (057/D1).
import { main } from "./main.ts";
import { VERSION } from "./version.ts";
import type { JournalSink } from "./journal/note.ts";

process.stdout.on("error", (e: NodeJS.ErrnoException) => {
  if (e.code === "EPIPE") process.exit(0);
});
const argv = process.argv.slice(2);
const sink: JournalSink = { signals: new Set() };
const t0 = performance.now();
let code: number;
let thrown: unknown;
let failed = false;
try {
  code = await main(argv, {
    cwd: process.cwd(),
    out: (s) => process.stdout.write(s),
    err: (s) => process.stderr.write(s),
    tty: process.stdout.isTTY === true,
    journal: sink,
  });
} catch (e) {
  failed = true;
  thrown = e;
  code = 3;
  try {
    const { errInfo } = await import("./journal/note.ts");
    sink.err = errInfo(e);
  } catch {
    // no journal detail
  }
}
try {
  // REQ-JRN-001 a usage error before the root check keeps no root. Only the "?" command with no --root looks for one (057/D2).
  if (sink.root === undefined && sink.cmd === "?" && !argv.some((a) => a === "--root" || a.startsWith("--root="))) {
    const { findRoot } = await import("./cli/root.ts");
    sink.root = findRoot(process.cwd());
  }
  if (sink.root !== undefined && process.env.SPECCTX_JOURNAL !== "0") {
    const { appendRun } = await import("./journal/journal.ts");
    appendRun(sink, { exit: code, ms: performance.now() - t0, version: VERSION });
  }
} catch {
  // the journal never changes the exit code or the output
}
if (failed) throw thrown;
process.exitCode = code;
