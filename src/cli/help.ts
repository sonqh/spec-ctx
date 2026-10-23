// REQ-CLI-002 help text. It passes scripts/ste-lint.py --baseline 0.
import { COMMANDS } from "./args.ts";

export const HELP = `specctx: a context engine for OpenSpec projects.

Usage: specctx <command> [flags]

Commands:
  build                  Write the index to .ctx/index.json.
  status                 Show the active changes and their task counts.
  query <term...>        Find the entries that contain all terms.
  related <ID>           Show the entries that link to an ID.
  bundle <ID...>         Print the spec text for the IDs and their links.
  check                  Find ID and link errors.
  init                   Write a default spec-ctx.toml file.

Flags for query:
  --kind <kind>          Show only entries of this kind.
  --change <name>        Show only entries of this change.
  --all                  Show all copies of an ID.
  --limit <n>            Show n lines at most. The default is 20. Use 0 for no limit.

Flags for related:
  --depth <n>            Follow links n steps. The default is 1.
  --all                  Show all copies of an ID.

Flags for bundle:
  --budget <n>           Stop at n characters. The default is 8000.
  --depth <n>            Follow links n steps. The default is 1.
  --all                  Show all copies of an ID.

Flags for check:
  --strict               Also find REQs and scenarios that have no test.

Global flags:
  --root <path>          Use this project root.
  --json                 Print one JSON document.
  --help                 Show this help.
  --version              Show the version.

Exit codes: 0 for success, 1 for findings, 2 for a usage error, 3 for an internal error.
`;

export function commandList(): string {
  return `commands: ${COMMANDS.join(", ")}\n`;
}
