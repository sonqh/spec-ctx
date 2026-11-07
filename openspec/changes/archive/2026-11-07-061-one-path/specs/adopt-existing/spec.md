## ADDED Requirements

### Requirement: REQ-ADOPT-011 Context after adopt
After it wrote IDs, `adopt` SHALL end with `next: <run> context <task>` for the task that `nextTask` picks, first by file and line in the lowest active change. With none it SHALL end with `next: <run> status`. The line before it SHALL say to run `<run> baseline write` to gate the old debt. It SHALL also say to commit it with a subject that starts with `baseline:`. `adopt --dry-run`, and `adopt` with nothing to write, SHALL print no such line.

Refs: REQ-ADOPT-002, REQ-CLI-010

#### Scenario: SCN-ADOPT-011-1 Open task
- **WHEN** `adopt` writes IDs on the no-ID fixture
- **THEN** the last line is `next: specctx context add-mfa/1.3` and the line before it says to run `specctx baseline write` and to commit with a subject that starts with `baseline:`

#### Scenario: SCN-ADOPT-011-2 No open task
- **WHEN** `adopt` writes IDs in a project whose tasks are all done
- **THEN** the last line is `next: specctx status`

#### Scenario: SCN-ADOPT-011-3 Nothing written
- **WHEN** `adopt --dry-run` runs, or `adopt` runs twice
- **THEN** the output has no `context` line and no `baseline write` line

## MODIFIED Requirements

### Requirement: REQ-ADOPT-002 Atomic assignment
`specctx adopt` SHALL write the dry run IDs into main headers and matching active delta headers in one step. Matching uses exact text or `RENAMED`. It SHALL run `check` before and after. A new finding SHALL restore every file and exit 1. Old findings SHALL not block. It SHALL add derived CAP codes to `spec-ctx.toml` and write `adopt-report.md`. It SHALL NOT write the baseline. After IDs it SHALL print a `next:` line (REQ-ADOPT-011).

Refs: REQ-ADOPT-001, REQ-CHK-001

#### Scenario: SCN-ADOPT-002-1 Main and delta agree
- **WHEN** the fixture has `### Requirement: Session timeout` in main and a MODIFIED block with the same header in an active change
- **THEN** both headers read `### Requirement: REQ-<CAP>-001 Session timeout` and `openspec validate --all --strict` passes

#### Scenario: SCN-ADOPT-002-2 Rollback
- **WHEN** a planted duplicate header makes `check` fail after the write
- **THEN** every file equals its content before `adopt` and the exit code is 1

#### Scenario: SCN-ADOPT-002-4 Legacy tasks do not block
- **WHEN** the fixture tasks cite no REQ and `check` reports `task-without-req` before the write
- **THEN** `adopt` still writes the IDs and exits 0

#### Scenario: SCN-ADOPT-002-3 Unmatched delta reported
- **WHEN** a delta header matches no main header and no RENAMED mapping
- **THEN** that header is unchanged and the report lists it under `unmatched`

#### Scenario: SCN-ADOPT-002-5 Baseline step after adopt
- **WHEN** `adopt` writes IDs on the no-ID fixture
- **THEN** it writes no `.ctx/baseline.json`, and the line before the last line says to run `specctx baseline write` and to commit with a subject that starts with `baseline:`

#### Scenario: SCN-ADOPT-002-6 No step when nothing was written
- **WHEN** `adopt` runs where no header needs an ID, or runs with `--dry-run`
- **THEN** the output has no `baseline:` line and no `baseline write` line

### Requirement: REQ-ADOPT-006 Two documented paths
The README SHALL show a fresh path (`openspec init`, then `specctx init --all`) and an existing path (`init --all`, `adopt`, `context <task>`, then `baseline write` as the gate step). The existing path section SHALL say that legacy tasks stay in the baseline until an agent adds `[REQ-...]` citations and a Verify code span. `baseline prune` then drops them. Each path SHALL have an end to end test in CI that starts from a fixture and ends with `specctx gate --strict` exit 0.

#### Scenario: SCN-ADOPT-006-1 Existing path end to end
- **WHEN** `tests/paths/existing.sh` runs on the no-ID fixture
- **THEN** it ends with `gate --strict` exit 0

#### Scenario: SCN-ADOPT-006-2 Fresh path end to end
- **WHEN** `tests/paths/fresh.sh` runs on an empty dir
- **THEN** it ends with `gate --strict` exit 0
