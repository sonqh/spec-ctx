// REQ-CLI-001 REQ-CLI-002 REQ-CLI-006 help text from one table of command records.
// `specctx --help` renders the three groups. `specctx <cmd> --help` renders one page.
// Every page passes `specctx lint ste --baseline 0`. Command names stay in backticks, so the lint reads them as code.
import { COMMANDS, GROUPS } from "./args.ts";

export type Group = "Read" | "Write" | "Setup";

export interface CommandHelp {
  /** The command name, one or two words. */
  name: string;
  group: Group;
  /** The arguments after the name, for the usage line and the overview. */
  args: string;
  summary: string;
  /** Command flags as [flag, text]. The global flags follow on every page. */
  flags: [string, string][];
  /** Exit codes as [code, text]. */
  exit: [string, string][];
  example: string;
  /** The overview label when it is not `<name> <args>`. */
  label?: string;
}

const OK: [string, string] = ["0", "Success."];
const USAGE: [string, string] = ["2", "A usage error."];
const INTERNAL: [string, string] = ["3", "An internal error."];
const PLAIN: [string, string][] = [OK, USAGE, INTERNAL];

const GLOBAL: [string, string][] = [
  ["--root <path>", "Use this project root."],
  ["--json", "Print one JSON document."],
  ["--help", "Show this help."],
];

const LINT_FLAGS: [string, string][] = [
  ["--baseline <n>", "Exit 0 when the hard findings are n or fewer. The default is 0."],
  ["--disable <rules>", "Ignore these rules. Separate them with commas."],
  ["--json", "Print the findings as JSON."],
  ["--selftest", "Run the built in tests of the linter."],
  ["--help", "Show this help."],
];

const LINT_EXIT: [string, string][] = [["0", "The hard findings are at the baseline or below."], ["1", "The hard findings are over the baseline."], USAGE];

export const TABLE: CommandHelp[] = [
  // Read
  { name: "status", group: "Read", args: "", summary: "Show the active changes, the current task, and the open questions.", flags: [], exit: PLAIN, example: "specctx status" },
  {
    name: "query", group: "Read", args: "[term...]", summary: "Find the entries that contain all terms. With --change and no term, list every entry of that change.",
    flags: [
      ["--kind <kind>", "Show only entries of this kind. Any case works."],
      ["--change <name>", "Show only entries of this change. The key or the full folder name works."],
      ["--limit <n>", "Show n lines at most. The default is 20. Use 0 for no limit."],
      ["--all", "Show all copies of an ID."],
    ],
    exit: PLAIN, example: "specctx query lockfile --kind req",
  },
  {
    name: "related", group: "Read", args: "<ID>", summary: "Show the entries that link to an ID.",
    flags: [["--depth <n>", "Follow links n steps. The default is 1."], ["--all", "Show all copies of an ID."]],
    exit: [OK, ["2", "A usage error or an unknown ID."], INTERNAL], example: "specctx related REQ-IDX-001",
  },
  {
    name: "bundle", group: "Read", args: "<ID...>", summary: "Print the spec text for the IDs and their links.",
    flags: [
      ["--budget <n>", "Stop at n characters. The default is 8000."],
      ["--depth <n>", "Follow links n steps. The default is 1."],
      ["--all", "Show all copies of an ID."],
    ],
    exit: [OK, ["2", "A usage error or an unknown ID."], INTERNAL], example: "specctx bundle REQ-IDX-001 --budget 3000",
  },
  {
    name: "check", group: "Read", args: "", summary: "Find ID and link errors.",
    flags: [["--strict", "Also find gaps in tests and evidence."]],
    exit: [["0", "No finding."], ["1", "One finding or more."], USAGE, INTERNAL], example: "specctx check --strict",
  },
  {
    name: "gate", group: "Read", args: "",
    summary: "Run `check`, the baseline against the merge base of [gate] base, the markdown linters, `openspec validate` with the command in [gate] openspec, and the length check. Stop at the first failure.",
    flags: [
      ["--strict", "Run `check` and `openspec validate` in strict mode."],
      ["--markdown <globs>", "Lint these markdown globs instead of [gate] markdown. Separate them with spaces."],
    ],
    exit: [["0", "Every step passed."], ["1", "A step failed."], USAGE, INTERNAL], example: "specctx gate --strict",
  },
  {
    name: "task next", group: "Read", args: "", summary: "Show the next open task.",
    flags: [["--change <name>", "Look only in this change. The key or the full folder name works."]],
    exit: [["0", "An open task."], ["1", "No open task."], USAGE, INTERNAL], example: "specctx task next --change 008",
  },
  {
    name: "task verify", group: "Read", args: "<task>", summary: "Run the `Verify:` command of a task. Write nothing.",
    flags: [], exit: [["0", "The command passed."], ["1", "The command failed."], USAGE, INTERNAL], example: "specctx task verify 008/1.1",
  },
  {
    name: "stats", group: "Read", args: "", summary: "Show five metrics for each change and the gate runs.",
    flags: [["--change <name>", "Show only this change."], ["--write", "Also write docs/metrics/<date>.md."]],
    exit: PLAIN, example: "specctx stats --write",
  },
  {
    name: "lint tells", group: "Read", args: "<file...>", summary: "Find the AI writing tells in markdown files. Read stdin when no file is given.",
    flags: LINT_FLAGS, exit: LINT_EXIT, example: "specctx lint tells --baseline 0 README.md",
  },
  {
    name: "lint ste", group: "Read", args: "<file...>", summary: "Find the breaks of the structural STE rules in markdown files. Read stdin when no file is given.",
    flags: LINT_FLAGS, exit: LINT_EXIT, example: "specctx lint ste --baseline 0 README.md",
  },
  // Write
  { name: "build", group: "Write", args: "", summary: "Write the index to .ctx/index.json.", flags: [], exit: PLAIN, example: "specctx build" },
  {
    name: "id new", group: "Write", args: "<kind> <code>", summary: "Print the next free ID. The kind is REQ, SCN, ADR, or DEC.",
    flags: [["--for <REQ-ID>", "Give the requirement of a new scenario."], ["--count <n>", "Print n IDs in sequence."]],
    exit: [OK, ["2", "A usage error or an unknown code."], INTERNAL], example: "specctx id new REQ IDX",
  },
  {
    name: "id retire", group: "Write", args: "<ID> <reason>", summary: "Add an ID to decisions/retired-ids.md.",
    flags: [], exit: [OK, ["2", "A usage error, or the ID is still in use."], INTERNAL], example: "specctx id retire REQ-IDX-009 merged into REQ-IDX-001",
  },
  {
    name: "task start", group: "Write", args: "<task>", summary: "Print the bundle of a task and set it as the current task.",
    flags: [], exit: [OK, ["2", "A usage error, or the task is done or unknown."], INTERNAL], example: "specctx task start 008/1.1",
  },
  {
    name: "task done", group: "Write", args: "<task>", summary: "Run the `Verify:` command. On success, write the evidence and set the checkbox.",
    flags: [["--manual <note>", "Record a manual note. A task with no `Verify:` command needs this flag."]],
    exit: [OK, ["1", "The `Verify:` command failed. The task stays open."], USAGE, INTERNAL], example: "specctx task done 008/1.1",
  },
  {
    name: "task reopen", group: "Write", args: "<task> <why>", summary: "Clear the checkbox and keep the old evidence.",
    flags: [], exit: PLAIN, example: "specctx task reopen 008/1.1 the spec changed",
  },
  { name: "handoff write", group: "Write", args: "", summary: "Write .ctx/handoff.md from the index and the evidence.", flags: [], exit: PLAIN, example: "specctx handoff write" },
  {
    name: "handoff ask", group: "Write", args: "<question>", summary: "Add an open question to the handoff.",
    flags: [], exit: PLAIN, example: "specctx handoff ask \"Keep the old flag?\"",
  },
  {
    name: "handoff resolve", group: "Write", args: "<n> <answer>", summary: "Move open question n to the resolved list.",
    flags: [], exit: PLAIN, example: "specctx handoff resolve 1 \"yes, for one release\"",
  },
  // Setup
  {
    name: "init", group: "Setup", args: "", summary: "Write a default spec-ctx.toml file.",
    flags: [
      ["--schema", "Also install the ID templates and add the spec-ctx rules to openspec/config.yaml."],
      ["--skills", "Also install the specctx-run skill and its aliases in .claude/skills and .agents/skills."],
      ["--all", "Do all three."],
      ["--force", "Replace the files that have other content. spec-ctx.toml stays."],
    ],
    exit: PLAIN, example: "specctx init --all",
  },
  {
    name: "adopt", group: "Setup", args: "", summary: "Write IDs into the headers of the main specs and the active deltas. Undo on a new finding.",
    flags: [["--dry-run", "Show the ID that each header without an ID gets. Write nothing."]],
    exit: [["0", "The IDs are written, or nothing is left to adopt."], ["1", "The dry run found headers to adopt, or a new finding undid the write."], USAGE, INTERNAL],
    example: "specctx adopt --dry-run",
  },
  {
    name: "baseline write", group: "Setup", args: "", summary: "Record the current debt in .ctx/baseline.json. `check` then hides it.",
    flags: [], exit: PLAIN, example: "specctx baseline write",
  },
  { name: "baseline prune", group: "Setup", args: "", summary: "Remove the entries that no longer apply.", flags: [], exit: PLAIN, example: "specctx baseline prune" },
  {
    name: "help", group: "Setup", args: "<command>", summary: "Show the help page of one command.",
    flags: [], exit: [OK, ["2", "An unknown command."]], example: "specctx help task start",
  },
];

const WIDTH = 29;

/** One label line: two spaces, the label in backticks, padded. A long label puts the text on the next line. */
function row(label: string, text: string): string {
  const cell = `\`${label}\``;
  if (cell.length < WIDTH) return `  ${cell.padEnd(WIDTH)}${text}`;
  return `  ${cell}\n  ${" ".repeat(WIDTH)}${text}`;
}

const usageOf = (c: CommandHelp): string => `${c.name}${c.args ? " " + c.args : ""}`;

function overview(): string {
  const out = ["specctx: a context engine and task workflow for OpenSpec projects.", "", "Usage: specctx <command> [flags]", ""];
  for (const g of ["Read", "Write", "Setup"] as Group[]) {
    out.push(`${g}:`);
    for (const c of TABLE.filter((x) => x.group === g)) out.push(row(c.label ?? usageOf(c), c.summary));
    out.push("");
  }
  out.push("Command flags:");
  for (const c of TABLE) {
    if (c.name.startsWith("lint ")) continue;
    for (const [flag, text] of c.flags) out.push(row(`${c.name} ${flag}`, text));
  }
  for (const [flag, text] of LINT_FLAGS.filter(([f]) => f !== "--help")) out.push(row(`lint ${flag}`, text));
  out.push("");
  out.push("Global flags:");
  for (const [flag, text] of GLOBAL) out.push(row(flag, text));
  out.push(row("--version", "Show the version."));
  out.push("");
  out.push("Exit codes: 0 for success, 1 for findings or a failed `Verify:` command, 2 for a usage error, 3 for an internal error.");
  out.push("Run `specctx help <command>` or `specctx <command> --help` for the page of one command.");
  return out.join("\n") + "\n";
}

export const HELP = overview();

/** REQ-CLI-006 the page of one command: Usage, Flags, Exit codes, Example. */
export function commandPage(c: CommandHelp): string {
  const lint = c.name.startsWith("lint ");
  const flags = lint ? c.flags : [...c.flags, ...GLOBAL];
  const out = [
    `specctx ${c.name}: ${c.summary}`,
    "",
    "Usage:",
    `  \`specctx ${usageOf(c)}${flags.length ? " [flags]" : ""}\``,
    "",
    "Flags:",
    ...flags.map(([f, t]) => row(f, t)),
    "",
    "Exit codes:",
    ...c.exit.map(([code, t]) => `  \`${code}\` ${t}`),
    "",
    "Example:",
    `  \`${c.example}\``,
  ];
  return out.join("\n") + "\n";
}

export function findHelp(name: string): CommandHelp | undefined {
  return TABLE.find((c) => c.name === name);
}

/**
 * The help for `specctx help <words>` or `specctx <words> --help`. A group name such as `task`
 * prints the pages of its subcommands. Unknown words return null.
 */
export function helpFor(name: string): string | null {
  const one = findHelp(name);
  if (one) return commandPage(one);
  if (GROUPS.includes(name) || name === "lint") {
    const subs = TABLE.filter((c) => c.name.startsWith(name + " "));
    if (subs.length) return subs.map(commandPage).join("\n");
  }
  return null;
}

/** REQ-CLI-002 REQ-CLI-006 the command list of the unknown command error. `help` and `lint` are in it. */
export function commandList(): string {
  const names = [...COMMANDS, "lint", "help"];
  return `commands: ${names.join(", ")}\n`;
}
