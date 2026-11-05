# Design

## Context

- `src/cli.ts` is the only entry that touches `process`. It awaits `main()` and sets `process.exitCode`. Tests call `main()` in process and spawn `dist/cli.js`.
- `main()` in `src/main.ts` dispatches. `run()` in `src/cli/commands.ts` finds the root, calls `requireOpenSpec` (lines 74 and 75), loads the config, and runs the command. `init` returns before the root check.
- `bundle()` returns `text`, `omitted`, `chars`, `budget`, and `complete`. It does not return the kinds of the kept blocks. Each block starts with a line made by `provenance()`: `-- <id> | <file>:<line> | <status> | <reason>`.
- The exit 3 path in `main()` prints `specctx: internal error: <stack>`. `tests/cli/cli.test.ts` asserts `internal error` in `err`.
- `tests/cli/run-source.test.ts` fails on a bare `specctx <word>` in any source file outside its allowlist (REQ-CLI-010).
- 24 test files spawn the CLI. Only some use `cleanEnv`. Some run `status --root <this repo>` with `process.env`.

## Goals / Non-Goals

**Goals:**
- Compute the north star from real runs.
- One command that prints a redacted, reviewable bug report.
- No change to exit code, stdout, or stderr, except the one exit 3 line.

**Non-Goals:**
- Upload, `gh` calls, network, a daemon, a reader other than `report`.
- Journal lines for help, version, or runs outside a project.

## Decisions

- D1 The write site is `src/cli.ts`. Refs: REQ-JRN-001, ADR-009
  - `Io` gets an optional field `journal?: JournalSink` with `{ root?: string; cmd?: string; run?: string; signals: Set<string>; err?: { name: string; code: string | null; frames: string[] } }`. A helper `note(io, patch)` in `src/journal/note.ts` fills it. It does nothing when `io.journal` is absent.
  - `src/cli.ts` creates the sink, runs `main()` inside a `try`, and after it returns calls `appendRun` once. A rejection outside the catch of `main()` records `internal-error` and rethrows. `process.exitCode` is set after the append.
  - `main()` and `run()` only call `note`. In-process tests pass no sink, so they never write. SCN-JRN-001-3 tests this.
  - `src/journal/note.ts` has no `node:fs` import, so a `--version` run loads no journal write code. `src/cli.ts` loads `src/journal/journal.ts` with a dynamic import only when `sink.root` is set (REQ-CLI-003, `tests/cli/startup.test.ts`).
  - Rejected: write inside `main()`. It would make every in-process test write, and a `finally` block would hide a rethrow.
- D2 Where and when. Refs: REQ-JRN-001, REQ-JRN-003
  - `sink.root` is set after `requireOpenSpec` passes in `run()`, and after `runInit` succeeds in `init()`. A usage error before the root check leaves `root` unset, so nothing is written.
  - A usage error in `main()` before `run()`, such as an unknown command, leaves `root` unset. `main()` notes `cmd` as `?` in the parse error, group, and unknown command branches. Only then, and only when `argv` has no `--root`, `src/cli.ts` calls `findRoot(cwd)` and uses that result (lead decision, question 86). `appendRun` still writes only when `<root>/openspec` is a directory. Help, version, and `lint` never get this fallback. So it writes nothing.
  - `appendRun` checks that `<root>/openspec` is a directory before it creates `.ctx/local`. It writes `.ctx/local/.gitignore` with `*` when absent.
  - `GITIGNORE_LINES` stays as it is. `init`, its tests, and its docs do not change. The `.gitignore` inside the folder covers the file, and `*` covers the `.gitignore` too.
  - Rotation: when `runs.jsonl` is over 256 KB, `renameSync` it to `runs.1.jsonl`, then append. One `try`/`catch` wraps the whole call and prints nothing.
- D3 The line and the signals. Refs: REQ-JRN-001, REQ-JRN-002
  - Line: `{at, cmd, exit, ms, signals, v: 1, version}`. It goes through `dumps` of the repo with indent removed, so keys sort. A new `dumpLine` in `src/journal/journal.ts` does `JSON.stringify` over the sorted value. The line has no newline inside. If it is over 4 KB, `appendRun` drops `err.frames` to 5 entries, then drops `err`.
  - `cmd` is `parsed.command` when `COMMANDS` holds it, and `?` otherwise. An unknown command gives `?`. A group with no subcommand (`task`) gives `?`.
  - The set is closed and `v` versions it: `init-ok`, `context-has-code-or-test`, `empty-context`, `truncated-context`, `usage-error`, `internal-error`. `note` ignores a value outside the set.
  - Only `context` emits `context-has-code-or-test`, `empty-context`, and `truncated-context`. `bundle` emits none. The helper `contextSignals(entries, b)` in `src/journal/signals.ts` reads the provenance lines of `b.text` through `parseProvenance`. It looks up each ID in `canon(entries)`. `commands.ts` runs it only when `io.journal` is set. A kind of `code` or `test` gives the signal. A run with no provenance line in `b.text` gives `empty-context`. `b.complete === false` gives `truncated-context`.
  - `src/graph/bundle.ts` exports `parseProvenance(line)` next to `provenance`. It anchors on `^-- (\S+) \| ` and returns the ID or `null`. `BundleResult` gets no new field. A test pairs it with `provenance`, so a format change breaks that test first. Task 1.1 adds the export and its test.
  - `init-ok` is set when `runInit` returns, for the `init` command only.
  - `usage-error` is exit 2 and `internal-error` is exit 3. `src/cli.ts` adds both from the exit code, so no catch site needs a note. Unknown commands exit 2 in `main()`.
- D4 The `err` object. Refs: REQ-JRN-002
  - `main()` notes `err` in its exit 3 branch. The wrapper in `src/cli.ts` notes it for a rejection.
  - `name` is `error.name`. `code` is `error.code` when it is an all-capital token such as `ERR_X`, else `null`. The message never goes in.
  - `frames` come from `error.stack`. Skip stack line 1, which holds the message. Convert a `file://` URL with `fileURLToPath`. Make the path relative to the package root first, then drop a frame that starts with `..` or has a `node_modules` part. The package root is two folders above `src/journal/journal.ts`, and the same in `dist`. Each frame is `<path relative to the package>:<line>`. No column. At most 10 frames.
  - A non-`Error` throw gives `name: "NonError"`, `code: null`, `frames: []`.
- D5 The off switch and test isolation. Refs: REQ-JRN-003
  - `SPECCTX_JOURNAL=0` and only that value turns it off. `appendRun` reads `process.env` at call time.
  - `cleanEnv()` in `tests/helpers.ts` sets `SPECCTX_JOURNAL` to `0`. `tests/parity/run.sh` exports it.
  - 24 test files spawn the CLI and several bypass `cleanEnv`. Some run on this repository. A new preload `tests/preload.ts` sets `process.env.SPECCTX_JOURNAL = "0"`. `bunfig.toml` (`preload`) and `vitest.config.ts` (`setupFiles`) load it. Every test that needs the journal passes `SPECCTX_JOURNAL=1` in its own `env`, under a temp dir. Lead decision, question 86: the preload stays.
  - Rejected: edit each spawning test. It touches 20 files for one line each.
- D6 The `report` command. Refs: REQ-JRN-004, REQ-JRN-005
  - `src/journal/report.ts` exports `buildReport(root, now)` as a pure function of the journal files and `spec-ctx.toml`. `commands.ts` calls it right after `requireOpenSpec` and before the config load, so a broken config still reports.
  - It reads `runs.1.jsonl` then `runs.jsonl`. It skips a line that does not parse or has a wrong `v`.
  - Sections:
    - `Versions`: spec-ctx, Node, `process.platform`, and `process.arch`.
    - `Config shape`: section and key names from `smol-toml`, no values, `none` when the file is absent or bad.
    - `North star`: minutes from the first `init-ok` to the first `context-has-code-or-test`, and the runs from the first through the second, or `n/a`.
    - `Time` (p95 ms per `cmd`, nearest rank), `Signals` (counts), `Last internal error` (name, code, frames, or `none`).
  - The last line: `Review this text, then run: gh issue create -R sonqh/spec-ctx --body-file <file>`. The user saves stdout to a file.
  - With no journal files: exit 0 and the line `no journal found under .ctx/local`.
  - Help text goes in `src/cli/help.ts` in group `Read` and passes `lint ste --baseline 0` with no disable.
- D7 The exit 3 line. Refs: REQ-JRN-006, REQ-CLI-010
  - `main()` adds `runCommand(io.journal?.run ?? "specctx", "report")` to a Strict line: `Run <cmd> and file the output at https://github.com/sonqh/spec-ctx/issues.` The sink field `run` takes `cfg.cli.run` after the config loads. The line goes through `runCommand`, so `run-source.test.ts` stays green and `src/main.ts` needs no allowlist entry.
  - `tests/cli/cli.test.ts` line 130 asserts `internal error` in `err`. The line is added after the stack, so that test stays green. The new test asserts the last line.
- D8 The capability code and the rules. Refs: ADR-009
  - A new code `JRN`. No existing code fits. `CLI` holds argument and help rules, `STAT` holds `stats` of the repository, and `LOOP` holds the loop. The journal is a new feature with its own files under `src/journal/`. `JRN` is in `[ids] caps` of `spec-ctx.toml`. The planner added it, since `id new` needs it.
  - Rule: no engine code reads `runs.jsonl` except `report`. No network ever. `tests/journal/read-rule.test.ts` lists the `src/` files that name `runs.jsonl`: `src/journal/journal.ts` and `src/journal/report.ts`.
  - ADR-009 replaces item 4 of ADR-008. ADR-008 Status and the last Direction bullet of `CLAUDE.md` carry that. The planner did both.
- D9 Tests, goldens, and shared files.
  - Help golden: `tests/fixtures/help-golden/help.out` and `pages.out` change with the new `report` page and overview line. Task 3.1 records them with `SPECCTX_HELP_RECORD=1` and notes it in `docs/verification/057.md`. `tests/cli/help.test.ts` reads `COMMANDS` and `TABLE`, so it needs no edit.
  - Parity: `tests/parity/run.sh` runs seven commands that are not `report`, so no golden changes. Task 1.1 exports `SPECCTX_JOURNAL=0` in the script. The harness copies the fixture to a temp dir.
  - `tests/cli/startup.test.ts` runs `status --root <repo>` with `process.env`. The preload covers it.
  - `COMMAND_FLAGS` in `src/cli/args.ts` gets `report: {}`. `REQ-CLI-001` lists the commands and already omits `context`, so it is not modified.
  - Shared files, one task each: `src/main.ts`, `src/cli.ts`, `tests/helpers.ts`, `tests/parity/run.sh`, `bunfig.toml`, `vitest.config.ts`, and `tests/preload.ts` in 1.1. `src/journal/report.ts` in 2.1. `src/cli/commands.ts`, `src/cli/args.ts`, `src/cli/help.ts`, and the goldens in 3.1. `README.md`, `CHANGELOG.md`, `docs/verification/057.md` in 4.1.

## Risks

- A write on every command adds time. One `appendFileSync` costs under 1 ms. `tests/index/perf.test.ts` runs with the switch off. Task 3.1 times a run with the journal on.
- The signal for kept blocks reads the printed text. A change of the provenance line breaks it. The test fails first, so the break shows.
- `.ctx/local` appears in this repository on every dogfood run. Its own `.gitignore` hides it.
