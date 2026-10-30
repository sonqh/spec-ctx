## ADDED Requirements

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
