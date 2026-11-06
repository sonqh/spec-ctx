# Design

## Context

- `errInfo` converts a `file://` path with `fileURLToPath`. A frame such as `node:internal/modules/run_main:12` has no such prefix. `relative(pkgRoot, file)` then resolves it against the working directory. When that is under the package root, the result looks like a package path.
- `report` runs before the config load in `src/cli/commands.ts`. The global flag `--json` is in the parser for every command, and the help renders it on every page.
- `id new` is in `src/ids/ids.ts`. It reads the index only.

## Decisions

D1 `errInfo` calls `isAbsolute(file)` after the URL conversion and skips the frame when it is false. The other rules stay.

D2 `report --json` throws `UsageExit("report takes no --json flag")` next to the existing check for arguments. In `commandPage` of `src/cli/help.ts`, the `report` page drops `--json` from the global flags, as the lint pages drop them (`const flags = lint ? c.flags : [...c.flags, ...GLOBAL]`). The exit 2 line of the `report` page reads `A usage error. The command has no JSON output.`

D3 The contract of `id new` stays. The help and the skill state it. The summary of the page says that a repeat call before `build` prints the same ID, and that `--count <n>` gets several. The skill says the same in the `plan` item.

D4 New help strings. Each passes `lint ste --baseline 0` with no disable, checked on a scratch file.

- `id new` summary: `Print the next free ID. The kind is REQ, SCN, ADR, or DEC. A second call before `build` prints the same ID.`
- `id new --count <n>`: `Print n IDs in sequence. Use it to get several IDs before `build`.`
- `report` exit 2: `A usage error. The command has no JSON output.`
