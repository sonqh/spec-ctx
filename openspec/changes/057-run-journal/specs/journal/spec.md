## ADDED Requirements

### Requirement: REQ-JRN-001 Journal write
After a command in a repository with `openspec/`, the CLI entry SHALL append one line to `<root>/.ctx/local/runs.jsonl`. The line has `v`, `at`, `version`, `cmd`, `exit`, `ms`, and `signals`. `cmd` is a known command name or `?`. The line holds no flag value, path, ID, or text. It stays under 4 KB. `main()` SHALL write nothing. Help, version, and runs with no root write nothing.

Refs: ADR-009, REQ-CLI-001

#### Scenario: SCN-JRN-001-1 Line shape
- **WHEN** `status` runs through the built CLI in a repository with `openspec/` and the switch is on
- **THEN** `runs.jsonl` holds one line with sorted keys `at`, `cmd`, `exit`, `ms`, `signals`, `v`, `version`, and `cmd` is `status`

#### Scenario: SCN-JRN-001-2 No root, no write
- **WHEN** `--version`, `--help`, or any command runs where no `openspec/` folder exists
- **THEN** no `.ctx/local` folder appears

#### Scenario: SCN-JRN-001-3 In process calls
- **WHEN** a test calls `main()` in process on a repository
- **THEN** no journal file appears, and an unknown command gives `cmd` of `?` only through the CLI entry

### Requirement: REQ-JRN-002 Signals
`signals` SHALL hold only values of this set: `init-ok`, `context-has-code-or-test`, `empty-context`, `truncated-context`, `usage-error`, `internal-error`. A kept block of kind code or test in `context` or `bundle` output gives the first. Exit 2 gives `usage-error`. Exit 3 gives `internal-error` and an `err` object with `name`, `code`, and `frames`. A frame is a spec-ctx path and a line. It holds no message.

Refs: REQ-JRN-001, ADR-009

#### Scenario: SCN-JRN-002-1 Context signals
- **WHEN** `context` runs on a task whose bundle keeps a code or test line, then on a path with no links
- **THEN** the first line has `context-has-code-or-test` and the second has `empty-context`

#### Scenario: SCN-JRN-002-2 Usage and truncation
- **WHEN** an unknown command runs, then `bundle` runs with a budget that omits blocks
- **THEN** the first line has `usage-error`, exit 2, and `cmd` of `?`. The second has `truncated-context`

#### Scenario: SCN-JRN-002-3 Internal error
- **WHEN** a command exits 3 on a damaged index
- **THEN** the line has `internal-error` and `err` with `name`, `code`, and `frames`. No frame is outside the package. No text of the error message appears

### Requirement: REQ-JRN-003 Journal safety
The journal SHALL create `.ctx/local` only when `<root>/openspec/` is a directory. It SHALL write `.ctx/local/.gitignore` with `*` when absent. Before an append it SHALL rename a file over 256 KB to `runs.1.jsonl`. Any failure SHALL stay silent. The journal SHALL NOT change the exit code, stdout, or stderr. `SPECCTX_JOURNAL=0` SHALL switch it off.

Refs: REQ-JRN-001, ADR-009

#### Scenario: SCN-JRN-003-1 Ignore file and rotation
- **WHEN** a run appends to a journal over 256 KB
- **THEN** that file becomes `runs.1.jsonl`, a new `runs.jsonl` holds one line, and `.ctx/local/.gitignore` is `*`

#### Scenario: SCN-JRN-003-2 Off switch and failure
- **WHEN** a run has `SPECCTX_JOURNAL=0`, then a run has a plain file at `.ctx/local`
- **THEN** the first run writes nothing, and the second run keeps its exit code and its output

### Requirement: REQ-JRN-004 Report command
`specctx report` SHALL read `runs.jsonl` and `runs.1.jsonl` and print Markdown to stdout. It lists the spec-ctx, Node, and OS versions. It lists config section and key names with no values. It gives the minutes and runs from the first `init-ok` to the first `context-has-code-or-test`, or `n/a`. It gives p95 ms per cmd, each signal count, and the last internal error. The last line names `gh issue create`.

Refs: REQ-JRN-001, REQ-JRN-002

#### Scenario: SCN-JRN-004-1 North star
- **WHEN** the journal holds `init-ok`, two other runs, then `context-has-code-or-test` ten minutes after `init-ok`
- **THEN** `report` prints 10 minutes and 3 runs. With no `context-has-code-or-test` line it prints `n/a`

#### Scenario: SCN-JRN-004-2 Report content
- **WHEN** `report` runs on a repository whose `spec-ctx.toml` has a `[bundle]` budget
- **THEN** stdout names `bundle` and `budget` with no value, the p95 per `cmd`, the signal counts, and the last internal error. The last line names `gh issue create`

### Requirement: REQ-JRN-005 Report limits
`report` SHALL exit 0 with a clear message when no journal exists. It SHALL skip a line that is not valid JSON. It SHALL never run `gh` and never use the network. No code outside `report` SHALL read `runs.jsonl`. The journal SHALL NOT feed any other command.

Refs: REQ-JRN-004, ADR-003

#### Scenario: SCN-JRN-005-1 No journal
- **WHEN** `report` runs and no journal file exists
- **THEN** it exits 0 and prints a message that says no journal exists

#### Scenario: SCN-JRN-005-2 Read rule
- **WHEN** a source test lists the files under `src/` that name `runs.jsonl`
- **THEN** only the journal module and the report module appear, and no source file runs `gh` or opens a network socket for `report`

### Requirement: REQ-JRN-006 Internal error hint
When a command exits 3, the stderr message SHALL end with one line. The line tells the user to run `report` and to file the output at the spec-ctx issues page. The command in that line SHALL use the run prefix.

Refs: REQ-JRN-004, REQ-CLI-010

#### Scenario: SCN-JRN-006-1 Exit 3 line
- **WHEN** a command exits 3 and the config has `[cli] run = "node dist/cli.js"`
- **THEN** the last stderr line names `node dist/cli.js report` and the issues page
