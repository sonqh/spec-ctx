## ADDED Requirements

### Requirement: REQ-LOOP-015 Rejection holds the stop
A plan or archive question resolved with `--reject` SHALL keep `next` at that stop. The newest question of the stage decides, the one with the highest `n`. `next` SHALL return `ask` at the plan stop and `archive` with `human: true` at the archive stop. The reason names the rejection, the number, and the answer. A rejected newest plan question SHALL hold the stop after a task started. An open one SHALL print `--approve` and `--reject` in its command.

Refs: REQ-HND-004, REQ-LOOP-007, REQ-LOOP-009

#### Scenario: SCN-LOOP-015-1 Rejected archive
- **WHEN** every task of `002-ids` has evidence and the gate passed, and a human resolves the archive question with `--reject "Not yet, review the notes"`
- **THEN** `next --json` prints `action: archive`, `human: true`, a reason that holds `archive rejected in question <n>` and the answer, and the command that asks a new archive question

#### Scenario: SCN-LOOP-015-2 Rejected plan
- **WHEN** planning of `002-ids` is complete, no task has `[x]`, and a human resolves the plan question with `--reject "Split task 2"`
- **THEN** `next --json` prints `action: ask`, `human: true`, `state: plan_stop`, a reason that holds `plan rejected in question <n>`, and the command that asks a new `--plan` question. A new `--plan` question resolved with `--approve` ends the stop

#### Scenario: SCN-LOOP-015-3 Open question shows the verdict form
- **WHEN** a question with `stage: plan` or `stage: archive` is open
- **THEN** `next --json` prints `action: ask` and a command that holds `--approve` and `--reject`. A question of another stage keeps the command `handoff resolve <n> "<answer>"`

#### Scenario: SCN-LOOP-015-4 Rejection beats the started guard
- **WHEN** a task of `002-ids` has `[x]`, or a current task of the change exists, and a human resolves the newest plan question with `--reject "Split task 2"`
- **THEN** `next --json` prints `action: ask`, `human: true`, `state: plan_stop`, and a reason that holds `plan rejected in question <n>`

#### Scenario: SCN-LOOP-015-5 The highest number decides
- **WHEN** a human approves plan question 1, rejects plan question 2, and later approves plan question 3. The archive stop has the same order
- **THEN** `next --json` holds the stop after question 2, and ends it after question 3

### Requirement: REQ-LOOP-016 No verdict is no approval
A resolved plan or archive question with no `verdict` SHALL count as not approved at both stops. The human asks again. At the plan stop, a newest question with no verdict SHALL NOT override the started guard. A change with a `[x]` or current task does not stop again.

Refs: REQ-LOOP-015, REQ-LOOP-009, REQ-LOOP-007

#### Scenario: SCN-LOOP-016-1 Plan question with no verdict
- **WHEN** planning of `002-ids` is complete, no task has `[x]`, and `questions.json` holds a resolved plan question with no `verdict`
- **THEN** `next --json` prints `action: ask`, `human: true`, and `state: plan_stop`

#### Scenario: SCN-LOOP-016-2 Archive question with no verdict
- **WHEN** every task of `002-ids` has evidence, the gate passed, and `questions.json` holds a resolved archive question with no `verdict` after the newest evidence
- **THEN** `next --json` prints `action: archive` and `human: true`

#### Scenario: SCN-LOOP-016-3 A started change is not stopped again
- **WHEN** a task of `002-ids` has `[x]`, or a current task exists, and the newest plan question has no `verdict`
- **THEN** `next --json` does not print `state: plan_stop`

## MODIFIED Requirements

### Requirement: REQ-LOOP-007 Archive stop in the engine
`handoff ask --change <c>` SHALL store `stage: plan` with `--plan`, whatever the task state. Else it SHALL store `stage: archive` when every task is `[x]`, or `stage: design`. At the archive stop `next` SHALL return the command `specctx handoff ask --change <c> "archive <c>?"`. The newest archive question, resolved with `--approve` after the newest evidence, SHALL turn the stop into `archive` with `human: false`.

Refs: REQ-LOOP-001, REQ-LOOP-005, REQ-HND-002, REQ-HND-004, ADR-006

#### Scenario: SCN-LOOP-007-1 Archive stop asks
- **WHEN** every task of `002-ids` has `[x]` and evidence, the gate passed, and `[loop] archive` is `ask`
- **THEN** `next --json` prints `action: archive`, `human: true`, and the command `specctx handoff ask --change 002-ids "archive 002-ids?"`

#### Scenario: SCN-LOOP-007-2 Open archive question
- **WHEN** the state of SCN-LOOP-007-1 holds and `handoff ask --change 002 "archive 002-ids?"` runs
- **THEN** `questions.json` gains an open question with `task: 002-ids` and `stage: archive`, and `next --json` prints `action: ask` with `human: true`

#### Scenario: SCN-LOOP-007-3 Resolve approves the archive
- **WHEN** a human resolves the question of SCN-LOOP-007-2 with `handoff resolve <n> --approve "yes"`. Then a second project has only a resolved question with `stage: plan` for the change
- **THEN** `next --json` prints `action: archive`, `human: false`, and `<openspec> archive 002-ids -y` for the first project, and `human: true` for the second

#### Scenario: SCN-LOOP-007-4 Stage by flag
- **WHEN** `002-ids` has an open task and `handoff ask --change 002 "q"` runs, then `handoff ask --change 002 --plan "p"` runs
- **THEN** the first question has `stage: design` and the second has `stage: plan`

### Requirement: REQ-LOOP-009 Plan stop in next
Take a change with planning complete, no `[x]` task, and no current task. It has no `stage: plan` question, or its newest (highest `n`) is neither open nor approved. `next` SHALL return `ask` with `human: true`, state `plan_stop`, and the command `specctx handoff ask --change <c> --plan "plan ready for <c>. Approve to start the tasks?"`. A question without `--plan` SHALL not end the stop. `<c>` is the folder name. No config switch.

Refs: REQ-LOOP-005, REQ-LOOP-007, REQ-LOOP-015, ADR-006

#### Scenario: SCN-LOOP-009-1 Plan question due
- **WHEN** planning of `002-ids` is complete, every task has a citation, and the change has no question
- **THEN** `next --json` prints `action: ask`, `human: true`, `state: plan_stop`, `task: null`, and the command `specctx handoff ask --change 002-ids --plan "plan ready for 002-ids. Approve to start the tasks?"`

#### Scenario: SCN-LOOP-009-2 The printed command ends the rule
- **WHEN** the command of SCN-LOOP-009-1 runs, then `handoff resolve <n> --approve "yes"` runs
- **THEN** `next --json` prints `ask` with `question_open` while the question is open, and `start` for the first open task after the resolve

#### Scenario: SCN-LOOP-009-3 No stop after the start
- **WHEN** a task of `002-ids` has `[x]`, or a current task of the change exists, or a human approved the newest question with `stage: plan`. In each case the newest plan question has no rejection
- **THEN** `next --json` does not print `state: plan_stop`

#### Scenario: SCN-LOOP-009-4 Design question keeps the stop
- **WHEN** `handoff ask --change 002-ids "which cache?"` runs during planning, then `handoff resolve <n> "redis"` runs
- **THEN** `next --json` prints `state: plan_stop` with the `--plan` command
