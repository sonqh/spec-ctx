# task-workflow (delta)

## MODIFIED Requirements

### Requirement: REQ-TASK-002 Start
`specctx task start <id>` SHALL print the bundle for the REQ IDs the task cites with the configured budget. Then it SHALL print one footer line `-- bundle <n> chars, <p>% of <m> chars of spec text`. `<m>` is the size of all canonical requirement, scenario, and decision text. It SHALL then write `.ctx/current.json` with the task id and start time. It SHALL exit 2 if the task is done or does not exist. `bundle` SHALL not print the footer.

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
