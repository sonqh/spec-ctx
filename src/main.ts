// REQ-CLI-001 REQ-CLI-002 REQ-CLI-003 command dispatch. Each command loads its modules inside its action.
import { COMMANDS, GROUPS, parseArgs, UsageError } from "./cli/args.ts";
import { VERSION } from "./version.ts";

export interface Io {
  cwd: string;
  out: (s: string) => void;
  err: (s: string) => void;
}

export async function main(argv: string[], io: Io): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (e) {
    if (e instanceof UsageError) {
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
    const { HELP } = await import("./cli/help.ts");
    if (parsed.command === null && !parsed.flags.help) {
      io.err(HELP);
      return 2;
    }
    io.out(HELP);
    return 0;
  }
  if (GROUPS.includes(parsed.command)) {
    const subs = COMMANDS.filter((c) => c.startsWith(parsed.command + " ")).map((c) => c.split(" ")[1]);
    io.err(`specctx: ${parsed.command} needs a subcommand: ${subs.join(", ")}\n`);
    return 2;
  }
  if (!COMMANDS.includes(parsed.command)) {
    const { commandList } = await import("./cli/help.ts");
    io.err(`specctx: unknown command: ${parsed.command}\n${commandList()}`);
    return 2;
  }
  try {
    const { run } = await import("./cli/commands.ts");
    return await run(parsed, io);
  } catch (e) {
    const { UsageExit } = await import("./cli/errors.ts");
    if (e instanceof UsageExit) {
      io.err(`specctx: ${e.message}\n`);
      return 2;
    }
    io.err(`specctx: internal error: ${(e as Error).stack ?? String(e)}\n`);
    return 3;
  }
}

