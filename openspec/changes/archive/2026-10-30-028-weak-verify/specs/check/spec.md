## ADDED Requirements

### Requirement: REQ-CHK-005 Weak Verify command
`check` SHALL report `weak-verify` for a task line of an active change whose Verify command, as `task done` runs it and trimmed, is only `true`, `:`, `exit 0`, or one `echo` with no `;`, `&`, or `|`. Plain `check` SHALL print it as an advisory warning and keep exit 0. `check --strict` SHALL print it as a hard finding and exit 1. `baseline write` SHALL record it.

Refs: REQ-CHK-001, REQ-CHK-002, REQ-VER-001, REQ-ADOPT-005

#### Scenario: SCN-CHK-005-1 Each weak form fires
- **WHEN** an active change has four task lines with Verify: `true`, Verify: `:`, Verify: `  exit 0 `, and Verify: `echo done`
- **THEN** `check --strict` prints `weak-verify` once for each of the four task IDs at its `tasks.md` line and exits 1

#### Scenario: SCN-CHK-005-2 Advisory in plain check
- **WHEN** an active change has one task line with Verify: `true` and the tree is otherwise clean
- **THEN** `check` prints `warning: weak-verify <task> <file>:<line>`, the summary counts `0 hard, 1 advisory`, and the exit code is 0

#### Scenario: SCN-CHK-005-3 A real command does not fire
- **WHEN** task lines have Verify: `bun test tests/a.test.ts`, Verify: `echo ok && bun test`, Verify: `echo ok | grep ok`, Verify: `truex`, and Verify: `exit 1`
- **THEN** `check --strict` prints no `weak-verify` finding

#### Scenario: SCN-CHK-005-4 Joined spans and cwd prefix
- **WHEN** one task line has Verify: `cwd=pkg true` and another has Verify: `true` `bun test`
- **THEN** `check --strict` reports `weak-verify` for the first task and not for the second

#### Scenario: SCN-CHK-005-5 Hint and archive
- **WHEN** an archived change has a task line with Verify: `true` and an active change has one
- **THEN** `check --strict` reports only the active task and prints the hint `Name a test file or a command whose exit code proves the task.`

#### Scenario: SCN-CHK-005-6 Baseline holds legacy debt only
- **WHEN** an active change has a task line with Verify: `true`, `baseline write` runs, and then the agent adds a second task line with Verify: `echo ok`
- **THEN** `.ctx/baseline.json` holds `weak-verify` for the first task, and `check --strict` reports `weak-verify` only for the second task and prints `baselined: 1`
