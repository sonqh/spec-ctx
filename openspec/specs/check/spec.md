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
`specctx check --strict` SHALL add three rules. `unknown-task-req`: a task cites an ID that does not exist. `uncovered`: a canonical active REQ with no `Covers:` test. An ID named by a `## REMOVED` block of an active change SHALL be exempt from `uncovered` and `scenario-untested` until archive. A finding in `.ctx/baseline.json` SHALL be dropped in strict and non-strict mode and counted in a final line `baselined: <n>`.

#### Scenario: SCN-CHK-002-3 Pending removal is exempt
- **WHEN** an active change has `REQ-OLD-001` under `## REMOVED Requirements` and no test covers it
- **THEN** `check --strict` reports no `uncovered` and no `scenario-untested` for `REQ-OLD-001` or its scenarios

#### Scenario: SCN-CHK-002-1 Uncovered
- **WHEN** REQ-XX-003 is in main specs and no test has `Covers: REQ-XX-003`
- **THEN** `check --strict` exits 1 and prints `uncovered REQ-XX-003`

#### Scenario: SCN-CHK-002-2 Parity
- **WHEN** both engines run `check --strict` on the parity fixture with planted findings
- **THEN** the finding lists are identical

#### Scenario: SCN-CHK-002-4 Baselined findings are counted
- **WHEN** the baseline holds three entries that still fire
- **THEN** `check --strict` prints `baselined: 3` and exits 0 for a tree that is otherwise clean

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

### Requirement: REQ-CHK-004 Duplicate change key and summary
`check` SHALL report `duplicate-change-key` as a hard finding when two change folders, active or archived, resolve to one key. Human output SHALL end with one summary line `<n> findings in <m> files (<h> hard, <a> advisory)` and one line per rule present: `<rule>  <count>  <hint>`. Hints SHALL live in one table beside the rule definitions. `--json` output SHALL not change.

Refs: REQ-IDX-005

#### Scenario: SCN-CHK-004-1 Duplicate key
- **WHEN** both `001-a` and `001-b` exist under `openspec/changes/`
- **THEN** `check` prints `duplicate-change-key 001` as hard and exits 1

#### Scenario: SCN-CHK-004-2 Summary line
- **WHEN** `check --strict` finds 3 `uncovered` and 1 `req-without-scn` in two files
- **THEN** the output ends with `4 findings in 2 files (4 hard, 0 advisory)` and a line for each of the two rules with its hint

#### Scenario: SCN-CHK-004-3 Clean
- **WHEN** `check` finds nothing
- **THEN** it prints `0 findings` and exits 0
