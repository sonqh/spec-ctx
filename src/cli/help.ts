// REQ-CLI-001 REQ-CLI-002 help text in three groups. It passes `specctx lint ste --baseline 0`.
// Command names and the Verify keyword stay in backticks, so the lint reads them as code.
import { COMMANDS } from "./args.ts";

export const HELP = `specctx: a context engine and task workflow for OpenSpec projects.

Usage: specctx <command> [flags]

Read:
  \`status\`                     Show the active changes, the current task, and the open questions.
  \`query <term...>\`            Find the entries that contain all terms.
  \`related <ID>\`               Show the entries that link to an ID.
  \`bundle <ID...>\`             Print the spec text for the IDs and their links.
  \`check\`                      Find ID and link errors.
  \`gate\`                       Run \`check\`, the markdown linters, \`openspec validate\`, and the length check. Stop at the first failure.
  \`task next\`                  Show the next open task.
  \`task verify <task>\`         Run the \`Verify:\` command of a task. Write nothing.
  \`stats\`                      Show five metrics for each change and the gate runs.
  \`lint tells <file...>\`       Find the AI writing tells in markdown files.
  \`lint ste <file...>\`         Find the breaks of the structural STE rules in markdown files.

Write:
  \`build\`                      Write the index to .ctx/index.json.
  \`id new <kind> <code>\`       Print the next free ID. The kind is REQ, SCN, ADR, or DEC.
  \`id retire <ID> <reason>\`    Add an ID to decisions/retired-ids.md.
  \`task start <task>\`          Print the bundle of a task and set it as the current task.
  \`task done <task>\`           Run the \`Verify:\` command. On success, write the evidence and set the checkbox.
  \`task reopen <task> <why>\`   Clear the checkbox and keep the old evidence.
  \`handoff write\`              Write .ctx/handoff.md from the index and the evidence.
  \`handoff ask <question>\`     Add an open question to the handoff.
  \`handoff resolve <n> <answer>\`
                               Move open question n to the resolved list.

Setup:
  \`init\`                       Write a default spec-ctx.toml file.
  \`init --schema\`              Also install the spec-driven-ids schema and add its rules to openspec/config.yaml.
  \`init --skills\`              Also install the three skills in .claude/skills and .agents/skills.
  \`init --all\`                 Do all three.
  \`init --force\`               Install over files that exist. An existing spec-ctx.toml stays.
  \`adopt --dry-run\`            Show the ID that each header without an ID gets. Write nothing.
  \`adopt\`                      Write those IDs into the main specs and the active deltas. Undo on a new finding.
  \`task backfill --manual <note>\`
                               Write manual evidence for every ticked task that has none.
  \`baseline write\`             Record the current debt in .ctx/baseline.json. \`check\` then hides it.
  \`baseline prune\`             Remove the entries that no longer apply.

Command flags:
  \`query --kind <kind>\`        Show only entries of this kind.
  \`query --change <name>\`      Show only entries of this change.
  \`query --limit <n>\`          Show n lines at most. The default is 20. Use 0 for no limit.
  \`related --depth <n>\`        Follow links n steps. The default is 1.
  \`bundle --budget <n>\`        Stop at n characters. The default is 8000.
  \`bundle --depth <n>\`         Follow links n steps. The default is 1.
  \`--all\`                      Show all copies of an ID in query, related, and bundle.
  \`check --strict\`             Also find gaps in tests and evidence.
  \`gate --strict\`              Run \`check\` and \`openspec validate\` in strict mode.
  \`gate --markdown <globs>\`    Lint these markdown globs. Separate them with spaces.
  \`id new --for <REQ-ID>\`      Give the requirement of a new scenario.
  \`id new --count <n>\`         Print n IDs in sequence.
  \`task next --change <name>\`  Look only in this change.
  \`stats --change <name>\`      Show only this change.
  \`stats --write\`              Also write docs/metrics/<date>.md.
  \`task backfill --change <name>\`
                               Look only in this change.
  \`task done --manual <note>\`  Record a manual note. A task with no \`Verify:\` command needs this flag.
  \`lint --baseline <n>\`        Exit 0 when the hard findings are n or fewer. The default is 0.
  \`lint --disable <rules>\`     Ignore these rules. Separate them with commas.
  \`lint --json\`                Print the findings as JSON.
  \`lint --selftest\`            Run the built in tests of the linter.

Global flags:
  \`--root <path>\`              Use this project root.
  \`--json\`                     Print one JSON document.
  \`--help\`                     Show this help.
  \`--version\`                  Show the version.

Exit codes: 0 for success, 1 for findings or a failed \`Verify:\` command, 2 for a usage error, 3 for an internal error.
`;

export function commandList(): string {
  return `commands: ${COMMANDS.join(", ")}\n`;
}
