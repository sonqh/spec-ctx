# task-workflow (delta)

## MODIFIED Requirements

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
- **THEN** stdout has two lines: `task add-mfa/1.3 cites no REQ. Find one with specctx query <term> --change add-mfa --kind req, then add [REQ-<CAP>-NNN] to the task line.` and the footer with `bundle 0 chars`
