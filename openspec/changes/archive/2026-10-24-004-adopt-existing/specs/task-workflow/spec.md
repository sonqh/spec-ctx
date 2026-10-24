# task-workflow

## ADDED Requirements

### Requirement: REQ-TASK-006 Backfill
`specctx task backfill --manual "<note>" [--change <name>]` SHALL write manual evidence for every `[x]` task that has no evidence file, in active and archived changes, through the same path as `task done --manual`. It SHALL print the count per change and SHALL not touch tasks that already have evidence.

Refs: REQ-TASK-003, ADR-004

#### Scenario: SCN-TASK-006-1 Count per change
- **WHEN** two archived changes have 5 and 7 ticked tasks without evidence
- **THEN** `task backfill --manual adopted` writes 12 files and prints both counts

#### Scenario: SCN-TASK-006-2 Existing evidence kept
- **WHEN** a task already has command evidence
- **THEN** `backfill` leaves its file byte-identical
