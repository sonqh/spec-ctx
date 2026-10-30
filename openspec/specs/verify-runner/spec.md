# verify-runner Specification

## Purpose
How a `Verify:` clause becomes a command the tool can run.

## Requirements

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

### Requirement: REQ-VER-004 Working directory prefix
A Verify code span MAY start with `cwd=<path> `. The runner SHALL run the rest of the command with that path, relative to the project root, as the working directory. A path outside the project root SHALL exit 2. The prefix SHALL be stripped from the command stored in evidence and `cwd` SHALL be stored as its own field.

Refs: REQ-VER-001, REQ-TASK-004

#### Scenario: SCN-VER-004-1 Fixture cwd
- **WHEN** the task line has ``Verify: `cwd=tests/fixtures/no-id-repo npx openspec validate --all` ``
- **THEN** the command runs inside that folder and the evidence has `cwd: "tests/fixtures/no-id-repo"`

#### Scenario: SCN-VER-004-2 Outside root
- **WHEN** the prefix is `cwd=../other`
- **THEN** `task done` exits 2 and names the path

### Requirement: REQ-VER-005 Closed tasks by ID
The rerun SHALL set `mb` to `git merge-base HEAD <base>`. A task counts as closed when HEAD marks it `[x]` and `mb` marks it open or lacks it. The key drops the archive date prefix. With two copies of an ID, the active copy wins. With no merge base the rerun SHALL fail with `rerun: no merge base with <base>, fetch full history (fetch-depth: 0)` and name a shallow clone.

Refs: REQ-IDX-005, REQ-ADOPT-008

#### Scenario: SCN-VER-005-1 Closed in the range
- **WHEN** task 1.1 has `[ ]` at `mb` and `[x]` at HEAD, and task 1.2 has `[x]` at both
- **THEN** only task 1.1 counts as closed

#### Scenario: SCN-VER-005-2 Archive in the range
- **WHEN** the archive moved a change after `mb`, and its task 1.1 had `[ ]` at `mb` and has `[x]` at HEAD
- **THEN** the task keeps its ID and counts as closed

#### Scenario: SCN-VER-005-3 No merge base
- **WHEN** no merge base with `<base>` exists
- **THEN** the rerun prints the one line, names a shallow clone when `git rev-parse --is-shallow-repository` prints `true`, and exits 1

### Requirement: REQ-VER-006 Compare a closed task
The rerun SHALL check each closed task in this order. `manual` evidence warns, and fails under `--strict`. Missing evidence fails `no-evidence`. A Verify command or cwd that differs from the evidence fails `verify-drift` and runs nothing. A weak Verify fails under `--strict`. Otherwise it runs the frozen command in the evidence cwd with `verify.timeout_s`. A different exit code or a timeout fails `mismatch`.

Refs: REQ-VER-001, REQ-CHK-005

#### Scenario: SCN-VER-006-1 Manual evidence
- **WHEN** a closed task has `manual` evidence
- **THEN** the line is `warn`, and the run fails under `--strict`

#### Scenario: SCN-VER-006-2 No evidence
- **WHEN** a closed task has no evidence file
- **THEN** the line is `no-evidence` and the run exits 1

#### Scenario: SCN-VER-006-3 Drift runs nothing
- **WHEN** tasks.md has a different command, or a different cwd, than the evidence
- **THEN** the line is `verify-drift` and the command does not run

#### Scenario: SCN-VER-006-4 Weak Verify
- **WHEN** a closed task has the Verify command `true`
- **THEN** the run fails under `--strict` and the command does not run

#### Scenario: SCN-VER-006-5 Exit code mismatch
- **WHEN** the evidence has exit 0 and the frozen command exits 3, or runs past `verify.timeout_s`
- **THEN** the line is `mismatch`

#### Scenario: SCN-VER-006-6 Same exit code
- **WHEN** the frozen command exits like the evidence and prints a different output
- **THEN** the line is `ok`

### Requirement: REQ-VER-007 Run order and report
Closed tasks with the same frozen command and cwd SHALL run once and share the result. Groups run one at a time, in the ID order of their first task, with the current env plus `CI=1` and `SPECCTX_RERUN=1`. A `mismatch` SHALL print file:line, the evidence path, the expected and actual exit, the last 20 lines of output, and one line to reproduce it locally. The line quotes the cwd and the command.

Refs: REQ-VER-006, REQ-VER-003

#### Scenario: SCN-VER-007-1 Dedupe
- **WHEN** tasks 1.1 and 2.1 have the same frozen command and cwd
- **THEN** the command runs once, and both tasks get a line with the same result

#### Scenario: SCN-VER-007-2 Order and env
- **WHEN** closed tasks 2.1 and 1.1 have different commands
- **THEN** the 1.1 command runs first, then the 2.1 command, and each sees `CI=1` and `SPECCTX_RERUN=1`

#### Scenario: SCN-VER-007-3 Mismatch report
- **WHEN** a command exits 3 where the evidence says 0, and the cwd holds a space
- **THEN** the report holds the file:line of the task, the evidence path, `expected exit 0`, `actual exit 3`, the last 20 lines of output, and a `reproduce:` line that starts with `cd '<cwd>' &&`

### Requirement: REQ-VER-008 Replay of the rerun
`scripts/replay-rerun.sh <repo> --since <date>` SHALL visit each first-parent commit C, oldest first. In a temp worktree of C it SHALL run `gate --rerun --base C^1 --json` N times (default 3). It SHALL write a JSON line per commit and `summary.md` under `--out`. It SHALL leave `<repo>` unchanged. It exits 1 for a flaky task, 2 for a usage error, and 0 otherwise.

Refs: REQ-VER-007, ADR-006

#### Scenario: SCN-VER-008-1 Stable task
- **WHEN** a commit closes a task whose Verify exits like the evidence, and the repository has a root commit
- **THEN** the line holds the commit, date, runs, and the task with one result per run. All results agree and `flaky` is false. The root commit has no line. The exit code is 0

#### Scenario: SCN-VER-008-2 Mismatch is data
- **WHEN** a Verify always fails where the evidence says exit 0
- **THEN** every run of the task is `mismatch`, `flaky` is false, the summary counts one `mismatch`, and the exit code is 0

#### Scenario: SCN-VER-008-3 Flaky task
- **WHEN** a Verify alternates between exit 0 and exit 1 across runs
- **THEN** the results of the task differ, `flaky` is true, the summary counts one `flaky`, and the exit code is 1

#### Scenario: SCN-VER-008-4 Environment error
- **WHEN** the `--setup` command fails
- **THEN** the line of each commit holds an `error`, the summary counts it under `errors` and not under `flaky`, and the exit code is 0

#### Scenario: SCN-VER-008-5 Source stays unchanged
- **WHEN** the script ends, after a good run or a failed setup
- **THEN** the HEAD, branches, and status of `<repo>` are as before, and `git worktree list` shows only the main worktree

#### Scenario: SCN-VER-008-6 Usage error
- **WHEN** `--since` is missing, `<repo>` is not a git repository, or `--runs` is not a positive integer
- **THEN** the script prints a usage line to stderr, creates no output, and exits 2
