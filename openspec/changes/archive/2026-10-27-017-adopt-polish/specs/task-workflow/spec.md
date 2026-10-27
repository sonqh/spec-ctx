# task-workflow (delta)

## MODIFIED Requirements

### Requirement: REQ-TASK-006 Backfill
`specctx task backfill --manual "<note>" [--change <name>]` SHALL write manual evidence for every `[x]` task that has no evidence file, in active changes only, through the same path as `task done --manual`. It SHALL skip archived changes, print the count per change, and SHALL not touch tasks that already have evidence.

Refs: REQ-TASK-003, ADR-004

#### Scenario: SCN-TASK-006-1 Count per change
- **WHEN** two active changes have 5 and 7 ticked tasks without evidence
- **THEN** `task backfill --manual adopted` writes 12 files and prints both counts

#### Scenario: SCN-TASK-006-2 Existing evidence kept
- **WHEN** a task already has command evidence
- **THEN** `backfill` leaves its file byte-identical

#### Scenario: SCN-TASK-006-3 Archived changes skipped
- **WHEN** one active change has 2 ticked tasks without evidence and one archived change has 3
- **THEN** `task backfill --manual adopted` prints `backfilled 2 task(s)`, names only the active change, and writes no file under `.ctx/evidence/` for the archived one

### Requirement: REQ-TASK-002 Start
`specctx task start <id>` SHALL print the bundle for the REQ IDs the task cites, within the budget. A task with no REQ gets one hint line: run `specctx query --change --kind req`, then add `[REQ-<CAP>-NNN]`. Then one footer `-- bundle <n> chars, <p>% of <m> chars of spec text`. `<m>` counts all canonical REQ, SCN, and decision text. It SHALL write `.ctx/current.json` with the task id and start time. Exit 2 if the task is done or missing. `bundle` prints no footer.

Refs: REQ-QRY-003, REQ-STAT-002

#### Scenario: SCN-TASK-002-1 Start prints the bundle
- **WHEN** `task start 002/2.1` runs and the task cites `[REQ-TASK-001]`
- **THEN** stdout starts with `-- REQ-TASK-001 |` and `.ctx/current.json` names `002/2.1`

#### Scenario: SCN-TASK-002-2 Already done
- **WHEN** the task is `[x]`
- **THEN** it exits 2 and prints `task 002/2.1 is done`

#### Scenario: SCN-TASK-002-3 Footer
- **WHEN** `task start` runs on the fixture task `add-mfa/1.3`
- **THEN** the last line matches `^-- bundle \d+ chars, \d+(\.\d)?% of \d+ chars of spec text$` and `specctx bundle REQ-UA-004` prints no such line

#### Scenario: SCN-TASK-002-4 No REQ gives a hint
- **WHEN** `task start add-mfa/1.3` runs on the no-ID fixture after `adopt` and the task line cites no REQ
- **THEN** stdout has two lines: `task add-mfa/1.3 cites no REQ. Run specctx query --change add-mfa --kind req to list its requirements, then add [REQ-<CAP>-NNN] to the task line.` and the footer with `bundle 0 chars`
