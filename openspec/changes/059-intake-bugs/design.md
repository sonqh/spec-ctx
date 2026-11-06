# Design

## Context

- `errInfo` converts a `file://` path with `fileURLToPath`. A frame such as `node:internal/modules/run_main:12` has no such prefix. `relative(pkgRoot, file)` then resolves it against the working directory. When that is under the package root, the result looks like a package path.
- `report` runs before the config load in `src/cli/commands.ts`. The global flag `--json` is in the parser for every command, and the help renders it on every page.
- `id new` is in `src/ids/ids.ts`. It reads the index only.

## Decisions

D1 `errInfo` calls `isAbsolute(file)` after the URL conversion and skips the frame when it is false. The other rules stay.

D2 `report --json` throws `UsageExit("report takes no --json flag")` next to the existing check for arguments. The help page keeps the global `--json` line, because the global flags render on every page. The exit 2 line of the `report` page reads `A usage error. The command has no JSON output.`

D3 The contract of `id new` is documented, not changed. The summary of the page says that a repeat call before `build` prints the same ID, and that `--count <n>` gets several. The skill says the same in the `plan` item.

D4 The help strings pass `lint ste --baseline 0` with no disable, checked on a scratch file.
