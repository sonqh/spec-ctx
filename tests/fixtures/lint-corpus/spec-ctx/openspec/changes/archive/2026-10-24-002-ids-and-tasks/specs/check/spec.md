# check

## RENAMED Requirements

- FROM: `### Requirement: REQ-CHK-003 Evidence rules are reserved`
- TO: `### Requirement: REQ-CHK-003 Evidence rules`

## MODIFIED Requirements

### Requirement: REQ-CHK-003 Evidence rules
`check --strict` SHALL report three evidence rules. `done-without-evidence`: a `[x]` task in an active change with no evidence file. `stale-evidence`: an evidence file whose `files` digests differ from the tree. `evidence-without-done`: an evidence file whose task is `[ ]`. Archived changes SHALL be exempt from `stale-evidence`.

Refs: ADR-004, REQ-TASK-004

#### Scenario: SCN-CHK-003-1 Evidence present
- **WHEN** `.ctx/evidence/001/1.1.json` exists and task 001/1.1 is `[x]` with matching digests
- **THEN** `check --strict` prints `0 finding(s)` for a tree that is otherwise clean

#### Scenario: SCN-CHK-003-2 Hand ticked
- **WHEN** a task is `[x]` and no evidence file exists
- **THEN** `check --strict` reports `done-without-evidence 002/2.1`

#### Scenario: SCN-CHK-003-3 Code changed after done
- **WHEN** `src/a.ts` changes after evidence recorded its digest
- **THEN** `check --strict` reports `stale-evidence 002/2.1 src/a.ts`
