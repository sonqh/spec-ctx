## MODIFIED Requirements

### Requirement: REQ-LOOP-007 Archive stop in the engine
`handoff ask --change <c>` SHALL store `stage: archive` when every task of the change is `[x]`. Otherwise it SHALL store `stage: plan` with `--plan`, else `stage: design`. At the archive stop `next` SHALL return the command `specctx handoff ask --change <c> "archive <c>?"`. A question with `stage: archive`, resolved after the newest evidence of the change, SHALL turn the stop into `archive` with `human: false`. No match on question text.

Refs: REQ-LOOP-001, REQ-LOOP-005, REQ-HND-002, ADR-006

#### Scenario: SCN-LOOP-007-1 Archive stop asks
- **WHEN** every task of `002-ids` has `[x]` and evidence, the gate passed, and `[loop] archive` is `ask`
- **THEN** `next --json` prints `action: archive`, `human: true`, and the command `specctx handoff ask --change 002-ids "archive 002-ids?"`

#### Scenario: SCN-LOOP-007-2 Open archive question
- **WHEN** the state of SCN-LOOP-007-1 holds and `handoff ask --change 002 "archive 002-ids?"` runs
- **THEN** `questions.json` gains an open question with `task: 002-ids` and `stage: archive`, and `next --json` prints `action: ask` with `human: true`

#### Scenario: SCN-LOOP-007-3 Resolve approves the archive
- **WHEN** a human resolves the question of SCN-LOOP-007-2 with `handoff resolve <n> "yes"`. Then a second project has only a resolved question with `stage: plan` for the change
- **THEN** `next --json` prints `action: archive`, `human: false`, and `<openspec> archive 002-ids -y` for the first project, and `human: true` for the second

#### Scenario: SCN-LOOP-007-4 Stage by flag
- **WHEN** `002-ids` has an open task and `handoff ask --change 002 "q"` runs, then `handoff ask --change 002 --plan "p"` runs
- **THEN** the first question has `stage: design` and the second has `stage: plan`

### Requirement: REQ-LOOP-009 Plan stop in next
Take a change with planning complete, no `[x]` task, no current task, and no question with `stage: plan`, open or resolved. `next` SHALL return `ask` with `human: true`, state `plan_stop`, and the command `specctx handoff ask --change <c> --plan "plan ready for <c>. Approve to start the tasks?"`. A question without `--plan` SHALL not end the stop. `<c>` is the folder name. The rule comes after the citation rule. No config switch.

Refs: REQ-LOOP-005, REQ-LOOP-007, ADR-006

#### Scenario: SCN-LOOP-009-1 Plan question due
- **WHEN** planning of `002-ids` is complete, every task has a citation, and the change has no question
- **THEN** `next --json` prints `action: ask`, `human: true`, `state: plan_stop`, `task: null`, and the command `specctx handoff ask --change 002-ids --plan "plan ready for 002-ids. Approve to start the tasks?"`

#### Scenario: SCN-LOOP-009-2 The printed command ends the rule
- **WHEN** the command of SCN-LOOP-009-1 runs, then `handoff resolve <n> "yes"` runs
- **THEN** `next --json` prints `ask` with `question_open` while the question is open, and `start` for the first open task after the resolve

#### Scenario: SCN-LOOP-009-3 No stop after the start
- **WHEN** a task of `002-ids` has `[x]`, or a current task of the change exists, or a resolved question has `stage: plan`
- **THEN** `next --json` does not print `state: plan_stop`

#### Scenario: SCN-LOOP-009-4 Design question keeps the stop
- **WHEN** `handoff ask --change 002-ids "which cache?"` runs during planning, then `handoff resolve <n> "redis"` runs
- **THEN** `next --json` prints `state: plan_stop` with the `--plan` command

## ADDED Requirements

### Requirement: REQ-LOOP-011 Rerun line is not the gate
`next` SHALL judge the gate from the last line of `.ctx/gate-log.jsonl` whose `steps` is not exactly `["rerun"]`. A line from `gate --rerun` SHALL never count as a passing gate.

Refs: REQ-LOOP-001, REQ-CLI-009

#### Scenario: SCN-LOOP-011-1 Rerun after a failed gate
- **WHEN** every task has `[x]` and evidence, the last gate line has `ok: false`, and a later `rerun` line has `ok: true`
- **THEN** `next --json` prints `action: gate`

#### Scenario: SCN-LOOP-011-2 Rerun after a passing gate
- **WHEN** a passing gate line follows the newest evidence and a later `rerun` line has `ok: false`
- **THEN** `next --json` does not print `action: gate`

### Requirement: REQ-LOOP-012 Human tasks line
The human form of `next` SHALL print `tasks: none` for an empty list. Otherwise it SHALL print the IDs joined with a comma and a space. The JSON form SHALL not change.

Refs: REQ-LOOP-001

#### Scenario: SCN-LOOP-012-1 Empty list
- **WHEN** `next` runs without `--json` and no task is named
- **THEN** the output holds the line `tasks: none` and no line ends in a space

#### Scenario: SCN-LOOP-012-2 Several tasks
- **WHEN** `next` names the stale tasks `001/1.1` and `001/1.2`
- **THEN** the output holds the line `tasks: 001/1.1, 001/1.2`
