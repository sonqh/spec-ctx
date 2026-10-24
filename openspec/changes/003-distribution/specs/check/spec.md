# check

## MODIFIED Requirements

### Requirement: REQ-CHK-001 Base rules
`specctx check` SHALL report: `missing-id`, `scenario-id-mismatch`, `bad-ref`, `task-without-req`, `task-without-verify`, `duplicate-id` (two canonical entries), `reused-id` (the first ID of a row in `decisions/retired-ids.md` that has a non-archived entry), `dangling-ref`, `req-without-scn` (non-archived entries only), `code-tag-no-canonical`, `unknown-cap` (a code not in config). Each finding SHALL print `file:line  rule  id`. Exit 1 on any finding, else print `0 finding(s)`.

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

#### Scenario: SCN-CHK-001-4 Replacement ID in a retire reason
- **WHEN** a retired row reads `| REQ-CTX-008 | 2026-10-24 | moved to spec-ctx REQ-CLI-001 |`
- **THEN** `check` reports no `reused-id` for `REQ-CLI-001`

#### Scenario: SCN-CHK-001-5 Archived REMOVED block
- **WHEN** an archived change holds a `## REMOVED` block whose requirement has no scenario
- **THEN** `check` reports no `req-without-scn` for it

### Requirement: REQ-CHK-003 Evidence rules
`check --strict` SHALL report three evidence rules. `done-without-evidence`: a `[x]` task in an active change with no evidence file. `stale-evidence`: an evidence file whose `files` digests differ from the tree. `evidence-without-done`: an evidence file whose task is `[ ]`. Archived changes SHALL be exempt from `stale-evidence`. Evidence with `kind: manual` for a task in an active change SHALL print a warning `manual-evidence <task>` that does not count as a finding.

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
