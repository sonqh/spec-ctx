# check

## MODIFIED Requirements

### Requirement: REQ-CHK-002 Strict rules
`specctx check --strict` SHALL add three rules. `unknown-task-req`: a task cites an ID that does not exist. `uncovered`: a canonical active REQ with no `Covers:` test. `scenario-untested`: a scenario ID that no test file names.

#### Scenario: SCN-CHK-002-1 Uncovered
- **WHEN** REQ-XX-003 is in main specs and no test has `Covers: REQ-XX-003`
- **THEN** `check --strict` exits 1 and prints `uncovered REQ-XX-003`

#### Scenario: SCN-CHK-002-2 Parity
- **WHEN** both engines run `check --strict` on the parity fixture with planted findings
- **THEN** the finding lists are identical

### Requirement: REQ-CHK-003 Evidence rules
`check --strict` SHALL report three evidence rules. `done-without-evidence`: a `[x]` task in an active change with no evidence file. `stale-evidence`: an evidence file whose `files` digests differ from the tree. `evidence-without-done`: an evidence file whose task is `[ ]`. Archived changes SHALL be exempt from `stale-evidence`. Evidence with `kind: manual` for a task in an active change SHALL print a warning line `manual-evidence <task>` that does not count as a finding.

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

#### Scenario: SCN-CHK-003-4 Manual evidence warns
- **WHEN** task 003/4.1 has evidence with `kind: manual` and the change is active
- **THEN** `check --strict` prints `warning: manual-evidence 003/4.1` and still exits 0 for a tree that is otherwise clean
