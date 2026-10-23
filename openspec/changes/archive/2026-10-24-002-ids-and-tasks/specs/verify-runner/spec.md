# verify-runner

## Purpose

How a `Verify:` clause becomes a command the tool can run.

## ADDED Requirements

### Requirement: REQ-VER-001 Verify parsing
The runner SHALL read the task line after the literal `Verify:`. Every code span (backticks) on that line SHALL be a command. Several spans SHALL join with ` && `. A line with no span SHALL be `kind: manual`. The command SHALL run with `sh -c` in the project root with a timeout from config (default 600 s).

#### Scenario: SCN-VER-001-1 One span
- **WHEN** the line ends with ``Verify: `bun test tests/a.test.ts` ``
- **THEN** the parsed command is `bun test tests/a.test.ts`

#### Scenario: SCN-VER-001-2 Two spans
- **WHEN** the line has ``Verify: `bun run build` and `node dist/cli.js --version` ``
- **THEN** the parsed command is `bun run build && node dist/cli.js --version`

#### Scenario: SCN-VER-001-3 Prose
- **WHEN** the line says `Verify: read the transcript`
- **THEN** the parsed kind is `manual`

### Requirement: REQ-VER-002 Dry run
`specctx task verify <id>` SHALL run the task's Verify command and print its exit code and output tail without writing evidence or the checkbox.

#### Scenario: SCN-VER-002-1 Dry run writes nothing
- **WHEN** `task verify 002/2.1` runs
- **THEN** `tasks.md` and `.ctx/evidence/` are unchanged

### Requirement: REQ-VER-003 Timeout
A Verify command that exceeds the timeout SHALL be killed, and `done` SHALL exit 1 with `verify timed out after <n>s`.

#### Scenario: SCN-VER-003-1 Sleep past timeout
- **WHEN** config sets `verify.timeout_s = 1` and the command is `sleep 5`
- **THEN** `done` exits 1 with the timeout message and writes nothing
