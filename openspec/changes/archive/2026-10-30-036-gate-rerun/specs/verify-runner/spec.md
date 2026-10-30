## ADDED Requirements

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
Closed tasks with the same frozen command and cwd SHALL run once and share the result. Groups run one at a time, in the ID order of their first task, with the current env plus `CI=1` and `SPECCTX_RERUN=1`. A `mismatch` SHALL print file:line, the evidence path, the expected and actual exit, the last 20 lines of output, and one line to reproduce it locally.

Refs: REQ-VER-006, REQ-VER-003

#### Scenario: SCN-VER-007-1 Dedupe
- **WHEN** tasks 1.1 and 2.1 have the same frozen command and cwd
- **THEN** the command runs once, and both tasks get a line with the same result

#### Scenario: SCN-VER-007-2 Order and env
- **WHEN** closed tasks 2.1 and 1.1 have different commands
- **THEN** the 1.1 command runs first, then the 2.1 command, and each sees `CI=1` and `SPECCTX_RERUN=1`

#### Scenario: SCN-VER-007-3 Mismatch report
- **WHEN** a command exits 3 where the evidence says 0
- **THEN** the report holds the file:line of the task, the evidence path, `expected exit 0`, `actual exit 3`, the last 20 lines of output, and a `reproduce:` line that starts with `cd <cwd> &&`
