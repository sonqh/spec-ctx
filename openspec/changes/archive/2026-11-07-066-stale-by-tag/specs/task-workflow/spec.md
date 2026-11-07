## ADDED Requirements

### Requirement: REQ-TASK-009 Diff base at task start
`task start` SHALL write `base` into `.ctx/current.json`: the git HEAD and the sha256 of each changed or untracked file. `task done` SHALL add each file whose digest differs from `base` or that `base` lacks. Ignored files, `.ctx/`, `.claude/`, and any `tasks.md` stay out. With no git, no `base`, or a `base` of another task, it adds none (REQ-TASK-010) and prints one stderr note with the cause: `no git repo`, `no task start`, or `base lost`.

Refs: REQ-TASK-002, REQ-TASK-004

#### Scenario: SCN-TASK-009-1 File touched since start
- **WHEN** `task start` runs in a git repo, a later edit changes `src/b.ts` and adds the untracked `src/c.ts`, and `task done` runs
- **THEN** evidence `files` holds `src/b.ts` and `src/c.ts` and holds no file that was already changed at start with the same digest

#### Scenario: SCN-TASK-009-2 No git or no base
- **WHEN** the project is not a git repo, or `task done` runs with no `task start` for that task
- **THEN** `files` holds only the named and Verify files, and stderr has one note that names the cause

### Requirement: REQ-TASK-010 Carry the diff on repair
When `task done` has no matching `base` and a `reopened-*` copy of the task holds a `diff` field, `task done` SHALL carry those paths into `files` and `diff`. It keeps only paths that still exist and pass the filters of REQ-TASK-009. Evidence with no `diff` field carries nothing. The note still prints when no path is carried.

Refs: REQ-TASK-009, REQ-TASK-005

#### Scenario: SCN-TASK-010-1 Reopen then done
- **WHEN** a task closed with `diff` of `src/b.ts`, then `task reopen` and `task done` run with no `task start`
- **THEN** the new evidence holds `src/b.ts` in `files` and `diff`, and a reopened copy with no `diff` field carries nothing

## MODIFIED Requirements

### Requirement: REQ-TASK-004 Evidence shape
Each evidence file SHALL be JSON with sorted keys: `task`, `reqs`, `kind`, `verify`, `files`, `diff`, `at` (ISO 8601 UTC), `tool_version`. `verify` SHALL hold `command`, `exit`, `stdout_sha256`, and `stderr_tail` (20 lines at most). `files` SHALL map to its sha256 each existing file that the task line or its Verify command names, and each REQ-TASK-009 file. `diff` SHALL list the REQ-TASK-009 paths, sorted. A tag alone SHALL not add a file. Equal inputs SHALL differ only in `at`.

Refs: ADR-004

#### Scenario: SCN-TASK-004-1 Files digested
- **WHEN** the task line names `src/a.ts` in backticks and the file exists
- **THEN** evidence `files` has `src/a.ts` with its sha256

#### Scenario: SCN-TASK-004-2 Tag alone
- **WHEN** a task cites REQ-TASK-001, `src/a.ts` carries its tag, and neither the task line nor Verify names the file
- **THEN** evidence `files` does not hold `src/a.ts`, and a later edit of `src/a.ts` leaves the task fresh
