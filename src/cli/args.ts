// REQ-CLI-001 argument parser. It loads nothing else, so --version stays fast.

export interface FlagSpec {
  [name: string]: "bool" | "string" | "int";
}

export const GLOBAL_FLAGS: FlagSpec = { root: "string", json: "bool", help: "bool", version: "bool" };

/** Flags per command. A group command such as `task done` has a two word key. */
export const COMMAND_FLAGS: Record<string, FlagSpec> = {
  build: {},
  status: {},
  next: { change: "string" },
  query: { kind: "string", change: "string", all: "bool", limit: "int" },
  related: { depth: "int", all: "bool" },
  bundle: { budget: "int", depth: "int", all: "bool", block: "bool" },
  context: { budget: "int", depth: "int" },
  check: { strict: "bool" },
  stats: { change: "string", write: "bool" },
  gate: { strict: "bool", markdown: "string", rerun: "bool", base: "string" },
  "id new": { for: "string", count: "int" },
  "id retire": {},
  "task next": { change: "string" },
  "task start": {},
  "task verify": {},
  "task done": { manual: "string" },
  "task reopen": {},
  "handoff write": {},
  "handoff ask": { change: "string", plan: "bool" },
  "handoff resolve": {},
  adopt: { "dry-run": "bool" },
  "baseline write": {},
  "baseline prune": {},
  init: { schema: "bool", skills: "bool", all: "bool", force: "bool" },
};

export const GROUPS = ["id", "task", "handoff", "baseline"];
export const COMMANDS = Object.keys(COMMAND_FLAGS);

export class UsageError extends Error {}

export interface Parsed {
  /** `status`, `task done`, and so on. `id` alone when the subcommand is missing. */
  command: string | null;
  positional: string[];
  flags: Record<string, string | number | boolean>;
}

const SHORT: Record<string, string> = { "-h": "help", "-V": "version" };

export function parseArgs(argv: string[]): Parsed {
  const out: Parsed = { command: null, positional: [], flags: {} };
  const spec = (): FlagSpec => ({ ...GLOBAL_FLAGS, ...(out.command ? COMMAND_FLAGS[out.command] ?? {} : {}) });
  let onlyPositional = false;
  const positional = (a: string): void => {
    if (out.command === null) out.command = a;
    else if (GROUPS.includes(out.command) && !out.positional.length && !COMMAND_FLAGS[out.command]) out.command = `${out.command} ${a}`;
    else out.positional.push(a);
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (onlyPositional || !a.startsWith("-") || a === "-") {
      positional(a);
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
    const kind = spec()[name];
    if (!kind) throw new UsageError(`unknown flag: --${name}`);
    if (kind === "bool") {
      if (value !== undefined) throw new UsageError(`flag --${name} takes no value`);
      out.flags[name] = true;
      continue;
    }
    if (value === undefined) {
      value = argv[++i];
      if (value === undefined) throw new UsageError(`flag --${name} needs a value`);
    }
    if (kind === "int") {
      if (!/^-?\d+$/.test(value)) throw new UsageError(`flag --${name} needs an integer`);
      out.flags[name] = Number(value);
    } else out.flags[name] = value;
  }
  return out;
}
