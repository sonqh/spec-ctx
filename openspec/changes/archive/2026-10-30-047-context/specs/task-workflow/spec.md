## ADDED Requirements

### Requirement: REQ-TASK-007 Next command
`specctx task next --json` SHALL set `bundle_command` to the `context` command for the task, with the run prefix and the budget of the config. It names the answer that `task start` prints.

Refs: REQ-TASK-001, REQ-TASK-002, REQ-QRY-015

#### Scenario: SCN-TASK-007-1 Context command
- **WHEN** `task next --json` runs and the next task is `002/2.1`
- **THEN** `bundle_command` starts with `context 002/2.1`, behind the run prefix

## MODIFIED Requirements

### Requirement: REQ-TASK-002 Start
`specctx task start <id>` SHALL print what `specctx context <id>` prints for the task. A task with no REQ gets one hint line that names `specctx query --change --kind req`. Then one footer `-- bundle <n> chars, <p>% of <m> chars of spec text`. `<m>` counts canonical REQ, SCN, and decision text. It SHALL write `.ctx/current.json` with the task id, start time, and Verify command. A done or missing task exits 2. `bundle` prints no footer.

Refs: REQ-QRY-003, REQ-STAT-002

#### Scenario: SCN-TASK-002-1 Start prints the bundle
- **WHEN** `task start 002/2.1` runs and the task cites `[REQ-TASK-001]`
- **THEN** stdout starts with the same blocks as `context 002/2.1`, holds `-- REQ-TASK-001 |`, and `.ctx/current.json` names `002/2.1`

#### Scenario: SCN-TASK-002-2 Already done
- **WHEN** the task is `[x]`
- **THEN** it exits 2 and prints `task 002/2.1 is done`

#### Scenario: SCN-TASK-002-3 Footer
- **WHEN** `task start` runs on the fixture task `add-mfa/1.3`
- **THEN** the last line matches `^-- bundle \d+ chars, \d+(\.\d)?% of \d+ chars of spec text$` and `specctx bundle REQ-UA-004` prints no such line

#### Scenario: SCN-TASK-002-4 No REQ gives a hint
- **WHEN** `task start add-mfa/1.3` runs on the no-ID fixture after `adopt` and the task line cites no REQ
- **THEN** stdout has the blocks of `context add-mfa/1.3`, then the line `task add-mfa/1.3 cites no REQ. Run specctx query --change add-mfa --kind req to list its requirements, then add [REQ-<CAP>-NNN] to the task line.`, then the footer

#### Scenario: SCN-TASK-002-5 The Verify command is frozen
- **WHEN** `task start 002/2.1` runs and the task line has Verify: `true`
- **THEN** `.ctx/current.json` holds `"verify": "true"` beside `bundle_chars`, `started_at`, and `task`, and a task with no Verify code span gets `"verify": null`

#### Scenario: SCN-TASK-002-6 Shared task number
- **WHEN** an active task and an archived task share one ID, and `task start` runs on it
- **THEN** the output reflects the refs of the active task, and `context` for the same ID prints the same blocks
