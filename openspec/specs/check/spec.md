# check Specification

## Purpose
`check` is the integrity gate. It runs in the pre-commit hook and in CI.

## Requirements

### Requirement: REQ-CHK-001 Base rules
`specctx check` SHALL report: `missing-id`, `scenario-id-mismatch`, `bad-ref`, `task-without-req`, `task-without-verify`, `duplicate-id` (two canonical entries), `reused-id` (an ID in `decisions/retired-ids.md`), `dangling-ref`, `req-without-scn`, `code-tag-no-canonical`, `unknown-cap` (a code not in config). Each finding SHALL print `file:line  rule  id`. Exit 1 on any finding, else print `0 finding(s)`.

Refs: ADR-002

#### Scenario: SCN-CHK-001-1 Dangling ref
- **WHEN** a spec says `Refs: REQ-NOPE-001`
- **THEN** `check` exits 1 and prints the file, line, and `dangling-ref REQ-NOPE-001`

#### Scenario: SCN-CHK-001-2 Modified is not duplicate
- **WHEN** an active change holds a MODIFIED block for an ID that also exists in `openspec/specs/`
- **THEN** `check` reports no `duplicate-id` for it

#### Scenario: SCN-CHK-001-3 Unknown capability code
- **WHEN** a spec defines `REQ-ZZZ-001` and `ZZZ` is not in config
- **THEN** `check` reports `unknown-cap REQ-ZZZ-001`

### Requirement: REQ-CHK-002 Strict rules
`specctx check --strict` SHALL add three rules. `unknown-task-req`: a task cites an ID that does not exist. `uncovered`: a canonical active REQ with no `Covers:` test. `scenario-untested`: a scenario ID that no test file names.

#### Scenario: SCN-CHK-002-1 Uncovered
- **WHEN** REQ-X-003 is in main specs and no test has `Covers: REQ-X-003`
- **THEN** `check --strict` exits 1 and prints `uncovered REQ-X-003`

#### Scenario: SCN-CHK-002-2 Parity
- **WHEN** both engines run `check --strict` on the parity fixture with planted findings
- **THEN** the finding lists are identical

### Requirement: REQ-CHK-003 Evidence rules are reserved
`check` SHALL accept `.ctx/evidence/**` in the tree and SHALL not report on it in this change. Change 002 defines the evidence rules.

Refs: ADR-004

#### Scenario: SCN-CHK-003-1 Evidence present
- **WHEN** `.ctx/evidence/001/1.1.json` exists
- **THEN** `check` prints `0 finding(s)` for a tree that is otherwise clean
