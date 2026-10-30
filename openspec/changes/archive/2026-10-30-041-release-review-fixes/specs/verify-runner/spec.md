## ADDED Requirements

### Requirement: REQ-VER-009 Rerun cwd and spawn errors
The rerun SHALL check that the Verify cwd of a group exists. A missing directory SHALL fail each task of the group as `mismatch` with the reason `cwd does not exist: <dir>`. A spawn error SHALL fail each task of the group as `mismatch` and SHALL not stop the run. The rerun SHALL still print its report and append its log line.

Refs: REQ-VER-006, REQ-VER-007

#### Scenario: SCN-VER-009-1 Missing cwd
- **WHEN** a closed task has evidence with a cwd that names no path
- **THEN** the line is `mismatch` with `cwd does not exist: <dir>`, the command does not run, and the run exits 1

#### Scenario: SCN-VER-009-2 Spawn error
- **WHEN** `runVerify` rejects for a group
- **THEN** each task of the group is `mismatch`, the report is printed, and the log line is appended

### Requirement: REQ-VER-010 Rerun with the merge base at HEAD
When the merge base equals HEAD, `gate --rerun` SHALL print `rerun: merge base is HEAD, nothing to compare. On push, pass --base <the commit before the push>` and exit 0. It SHALL run no Verify command.

Refs: REQ-VER-005, REQ-CLI-009

#### Scenario: SCN-VER-010-1 Base is HEAD
- **WHEN** `gate --rerun` runs on a branch whose merge base with the base ref is HEAD
- **THEN** it prints the one line, runs no command, and exits 0

#### Scenario: SCN-VER-010-2 Older base
- **WHEN** `gate --rerun --base <older commit>` runs
- **THEN** it does not print the line and checks the closed tasks

### Requirement: REQ-VER-011 Non-ASCII change folders
The rerun SHALL read the tree of the merge base with `git ls-tree -z` and split paths on NUL. A change folder with a non-ASCII name SHALL count in the closed-task compare.

Refs: REQ-VER-005

#### Scenario: SCN-VER-011-1 Non-ASCII folder
- **WHEN** the change folder `openspec/changes/042-café` has task 1.1 open at the merge base and `[x]` at HEAD
- **THEN** task 1.1 counts as closed

### Requirement: REQ-VER-012 Replay date and empty range
`scripts/replay-rerun.sh` SHALL read a bare `YYYY-MM-DD` after `--since` as `YYYY-MM-DD 00:00`. When no commit matches it SHALL print `replay: 0 commits since <date>` to stderr and exit 0.

Refs: REQ-VER-008

#### Scenario: SCN-VER-012-1 Bare date
- **WHEN** a commit exists at 00:30 on the `--since` day and the script runs with that date
- **THEN** the script visits the commit

#### Scenario: SCN-VER-012-2 Nothing matches
- **WHEN** no commit is newer than `--since`
- **THEN** stderr holds `replay: 0 commits since <date>` and the exit code is 0
