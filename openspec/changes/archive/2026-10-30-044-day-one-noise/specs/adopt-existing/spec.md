## MODIFIED Requirements

### Requirement: REQ-ADOPT-002 Atomic assignment
`specctx adopt` SHALL write the dry run IDs into main headers and matching active delta headers in one step. Matching uses exact text or `RENAMED`. It SHALL run `check` before and after. A new finding SHALL restore every file and exit 1. Old findings SHALL not block. It SHALL add derived CAP codes to `spec-ctx.toml` and write `adopt-report.md`. It SHALL NOT write the baseline. After IDs it SHALL print a `baseline:` commit note and `next: <run> baseline write`.

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
- **THEN** it writes no `.ctx/baseline.json`, the last line is `next: specctx baseline write`, and the line before it says to commit the baseline with a subject that starts with `baseline:`

#### Scenario: SCN-ADOPT-002-6 No step when nothing was written
- **WHEN** `adopt` runs where no header needs an ID, or runs with `--dry-run`
- **THEN** the output has no `baseline:` line and no `baseline write` line
