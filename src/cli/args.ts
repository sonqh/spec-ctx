// REQ-CLI-001 argument parser. It loads nothing else, so --version stays fast.

export interface FlagSpec {
  [name: string]: "bool" | "string" | "int";
}

export const GLOBAL_FLAGS: FlagSpec = { root: "string", json: "bool", help: "bool", version: "bool" };

export const COMMAND_FLAGS: Record<string, FlagSpec> = {
  build: {},
  status: {},
  query: { kind: "string", change: "string", all: "bool", limit: "int" },
  related: { depth: "int", all: "bool" },
  bundle: { budget: "int", depth: "int", all: "bool" },
  check: { strict: "bool" },
  init: {},
};

export const COMMANDS = Object.keys(COMMAND_FLAGS);

export class UsageError extends Error {}

export interface Parsed {
  command: string | null;
  positional: string[];
  flags: Record<string, string | number | boolean>;
}

const SHORT: Record<string, string> = { "-h": "help", "-V": "version" };

export function parseArgs(argv: string[]): Parsed {
  const out: Parsed = { command: null, positional: [], flags: {} };
  const rest: string[] = [];
  // the first word that is not a flag is the command
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (out.command === null && !a.startsWith("-")) {
      out.command = a;
      continue;
    }
    rest.push(a);
  }
  const spec: FlagSpec = { ...GLOBAL_FLAGS, ...(out.command ? COMMAND_FLAGS[out.command] ?? {} : {}) };
  let onlyPositional = false;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (onlyPositional || !a.startsWith("-") || a === "-") {
      out.positional.push(a);
      continue;
    }
    if (a === "--") {
      onlyPositional = true;
      continue;
    }
    let name: string;
    let value: string | undefined;
    if (SHORT[a]) name = SHORT[a]!;
    else if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      name = eq < 0 ? a.slice(2) : a.slice(2, eq);
      value = eq < 0 ? undefined : a.slice(eq + 1);
    } else throw new UsageError(`unknown flag: ${a}`);
    const kind = spec[name];
    if (!kind) throw new UsageError(`unknown flag: --${name}`);
    if (kind === "bool") {
      if (value !== undefined) throw new UsageError(`flag --${name} takes no value`);
      out.flags[name] = true;
      continue;
    }
    if (value === undefined) {
      value = rest[++i];
      if (value === undefined) throw new UsageError(`flag --${name} needs a value`);
    }
    if (kind === "int") {
      if (!/^-?\d+$/.test(value)) throw new UsageError(`flag --${name} needs an integer`);
      out.flags[name] = Number(value);
    } else out.flags[name] = value;
  }
  return out;
}
