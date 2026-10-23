#!/usr/bin/env node
// REQ-CLI-001 bin entry. tests call main() from src/main.ts in process.
import { main } from "./main.ts";

process.stdout.on("error", (e: NodeJS.ErrnoException) => {
  if (e.code === "EPIPE") process.exit(0);
});
const code = await main(process.argv.slice(2), {
  cwd: process.cwd(),
  out: (s) => process.stdout.write(s),
  err: (s) => process.stderr.write(s),
});
process.exitCode = code;
