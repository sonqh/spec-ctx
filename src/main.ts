// REQ-CLI-001 REQ-CLI-002 REQ-CLI-003 command dispatch. Each command loads its modules inside its action.
import { resolve } from "node:path";
import { COMMANDS, GROUPS, parseArgs, UsageError } from "./cli/args.ts";
import { VERSION } from "./version.ts";
import { errInfo, note, type JournalSink } from "./journal/note.ts";
import { runCommand } from "./runcmd.ts";

export interface Io {
  cwd: string;
  out: (s: string) => void;
  err: (s: string) => void;
  /** REQ-CLI-008 true when stdout is a TTY. Tests that capture the output leave it unset. */
  tty?: boolean;
  /** REQ-JRN-001 the sink that the bin entry reads after main() returns. In process callers leave it unset, so they write no journal. */
  journal?: JournalSink;
}

export async function main(argv: string[], io: Io): Promise<number> {
  // REQ-LINT-001 the linters keep the argument rules of the Python scripts, so they skip this parser
  // REQ-CLI-006 `specctx help <cmd>` prints the page of one command
  if (argv[0] === "help") {
    const { HELP, helpFor, commandList } = await import("./cli/help.ts");
    const name = argv.slice(1).filter((a) => a !== "--help" && a !== "-h").join(" ");
    if (!name) {
      io.out(HELP);
      return 0;
    }
    const page = helpFor(name);
    if (page === null) {
      io.err(`specctx: unknown command: ${name}\n${commandList()}`);
      return 2;
    }
    io.out(page);
    return 0;
  }
  if (argv[0] === "lint") {
    const { runLint } = await import("./lint/cli.ts");
    return runLint(argv.slice(1), io);
  }
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (e) {
    if (e instanceof UsageError) {
      note(io, { cmd: "?" });
      io.err(`specctx: ${e.message}\n`);
      return 2;
    }
    throw e;
  }
  if (parsed.flags.version) {
    io.out(VERSION + "\n");
    return 0;
  }
  if (parsed.flags.help || parsed.command === null) {
    const { HELP, helpFor } = await import("./cli/help.ts");
    if (parsed.command === null && !parsed.flags.help) {
      io.err(HELP);
      return 2;
    }
    // REQ-CLI-006 `specctx <cmd> --help` prints the page of that command only
    io.out((parsed.command !== null && helpFor(parsed.command)) || HELP);
    return 0;
  }
  if (GROUPS.includes(parsed.command)) {
    note(io, { cmd: "?" });
    const subs = COMMANDS.filter((c) => c.startsWith(parsed.command + " ")).map((c) => c.split(" ")[1]);
    io.err(`specctx: ${parsed.command} needs a subcommand: ${subs.join(", ")}\n`);
    return 2;
  }
  if (!COMMANDS.includes(parsed.command)) {
    note(io, { cmd: "?" });
    const { commandList } = await import("./cli/help.ts");
    io.err(`specctx: unknown command: ${parsed.command}\n${commandList()}`);
    return 2;
  }
  note(io, { cmd: parsed.command });
  try {
    const { run } = await import("./cli/commands.ts");
    const code = await run(parsed, io);
    // REQ-JRN-002 init has no OpenSpec root check. Its root is the one it wrote to.
    if (code === 0 && parsed.command === "init") {
      note(io, { root: resolve(io.cwd, (parsed.flags.root as string | undefined) ?? "."), signal: "init-ok" });
    }
    return code;
  } catch (e) {
    const { UsageExit } = await import("./cli/errors.ts");
    if (e instanceof UsageExit) {
      io.err(`specctx: ${e.message}\n`);
      return 2;
    }
    io.err(`specctx: internal error: ${(e as Error).stack ?? String(e)}\n`);
    // REQ-JRN-006 one Strict line that points to the report command and the issues page
    io.err(`Run ${runCommand(io.journal?.run ?? "specctx", "report")} and file the output at https://github.com/sonqh/spec-ctx/issues.\n`);
    note(io, { err: errInfo(e) });
    return 3;
  }
}

