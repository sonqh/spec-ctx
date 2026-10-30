# loop Specification

## Purpose
The closed loop of ADR-006. One read command names the next action from the files on disk. A fail file records every failed Verify run. A cap stops the loop and asks a human.

## Requirements

### Requirement: REQ-LOOP-001 Next command
`specctx next [--json] [--change <c>]` SHALL read the files and write none. `--json` prints one object with the sorted keys `action`, `attempt`, `change`, `command`, `human`, `max_attempts`, `reason`, `state`, `task`, `tasks`. `action` SHALL be one of `plan`, `cite`, `start`, `work`, `fix`, `repair`, `gate`, `archive`, `ask`, `stop`. Planning state comes from OpenSpec `status --json`. The human form prints `action:` first and ends with `next: <command>`.

Refs: ADR-006, REQ-CLI-007, REQ-LOOP-002

#### Scenario: SCN-LOOP-001-1 Closed enum
- **WHEN** `next --json` runs on a project in every state of the decision order
- **THEN** every `action` is in the list of ten and every object has the ten keys in sorted order. No file under `.ctx/` changes except the index cache

#### Scenario: SCN-LOOP-001-2 Plan states
- **WHEN** no folder exists under `openspec/changes/` except `archive`, or the OpenSpec status reports `isPlanningComplete: false`, or the OpenSpec command exits 1
- **THEN** `next` prints `action: plan` with `human: true` and the command `<openspec> new change <name>`, then `action: plan` with `nextSteps[0]` as the command, then `action: stop` with a reason that starts with `openspec status failed`

#### Scenario: SCN-LOOP-001-3 Task states
- **WHEN** planning is complete and the change moves through five states. First a task with no REQ. Then a `[x]` task with no evidence. Then a current task with no fail file. Then a current task with one fail file. Then an open task with no current task
- **THEN** `next` prints `cite` with `specctx query --change <c> --kind req`, then `repair` with `specctx task done <t>`, then `work` with `specctx task done <t>`. Then `fix` with `attempt: 1` and the reason of REQ-LOOP-006. Then `start` with `specctx task start <t>`

#### Scenario: SCN-LOOP-001-4 Finish states
- **WHEN** every task has `[x]` and evidence, and `.ctx/gate-log.jsonl` has no `ok: true` line after the newest evidence, then has one. Then an open question names a task of the change
- **THEN** `next` prints `gate` with `specctx gate --strict`, then `archive` with `human: true` and the command of REQ-LOOP-007 under `[loop] archive = "ask"`, or with `human: false` and `<openspec> archive <c> -y` under `"auto"`. Then `ask` with `human: true` and the question text as the reason before any other rule

### Requirement: REQ-LOOP-002 Fail files and the attempt cap
A non zero Verify exit in `task done` SHALL write `.ctx/evidence/<c>/<t>.fail-<n>.json` with the keys `at`, `attempt`, `stderr_tail`, `task`, `verify`. `attempt` SHALL be the fail files of the task since `current.json.started_at` plus one. A resolved question for the task resets the count. At `[loop] max_attempts`, `task done` SHALL append a question that quotes the fail line and print a `blocked:` line. No command SHALL read a fail file as evidence.

Refs: ADR-006, REQ-TASK-003, REQ-HND-002

#### Scenario: SCN-LOOP-002-1 First failure
- **WHEN** `task start 002/2.2` ran and the Verify command of `002/2.2` exits 1
- **THEN** `.ctx/evidence/002/2.2.fail-1.json` exists with `attempt: 1`, `task: 002/2.2`, `verify.exit: 1`, and the printed tail under `stderr_tail`, no `.ctx/evidence/002/2.2.json` exists, and `task done` exits 1

#### Scenario: SCN-LOOP-002-2 Cap reached
- **WHEN** `[loop] max_attempts = 3` and the third `task done 002/2.2` since `task start` fails
- **THEN** `.ctx/questions.json` gains an open question with `task: 002/2.2` and the text `task 002/2.2 failed Verify 3 times. Last: <the failing line of the tail>. What should change?`, the last line is `blocked: question <k> written. Run specctx handoff resolve <k> "<answer>" to continue.`. A fourth run adds no second question. The exit code is 1

#### Scenario: SCN-LOOP-002-3 Attempt window
- **WHEN** two fail files of `002/2.2` exist from before `current.json.started_at`, or `handoff resolve` closed the question of the cap
- **THEN** the next failure writes `attempt: 1`, and without `current.json` every fail file of the task counts

#### Scenario: SCN-LOOP-002-4 Fail files are not evidence
- **WHEN** `.ctx/evidence/002/2.2.fail-1.json` exists and `002/2.2` is open
- **THEN** `check --strict` reports no `evidence-without-done` for it, `stats` counts no evidence for `002`, and a later passing `task done 002/2.2` writes `2.2.json` and keeps `2.2.fail-1.json`

#### Scenario: SCN-LOOP-002-5 Cap question quotes the failing line
- **WHEN** the third failure of `002/2.2` has the tail `$ bun test`, `FAIL two`, `1 fail`
- **THEN** the new question reads `task 002/2.2 failed Verify 3 times. Last: FAIL two. What should change?`

### Requirement: REQ-LOOP-003 Loop config
`spec-ctx.toml` SHALL hold `[loop] max_attempts`, an integer of 1 or more with the default 3, and `[loop] archive`, `"ask"` or `"auto"` with the default `"ask"`. Another value SHALL exit 2 with the key name. `init` SHALL write both keys with a comment above each. `task done` and `next` SHALL use `max_attempts` for the cap. `next` SHALL set `human: true` on `archive` when the value is `"ask"`.

Refs: ADR-006, REQ-DIST-002, REQ-LOOP-001, REQ-LOOP-002

#### Scenario: SCN-LOOP-003-1 Defaults
- **WHEN** `spec-ctx.toml` has no `[loop]` section
- **THEN** `loadConfig` gives `max_attempts: 3` and `archive: "ask"`

#### Scenario: SCN-LOOP-003-2 Bad max_attempts
- **WHEN** `[loop] max_attempts` is `0`, `2.5`, or `"3"`
- **THEN** every command exits 2 with `loop.max_attempts must be an integer of 1 or more`

#### Scenario: SCN-LOOP-003-3 Bad archive
- **WHEN** `[loop] archive` is `"yes"` or `1`
- **THEN** every command exits 2 with `loop.archive must be "ask" or "auto"`

#### Scenario: SCN-LOOP-003-4 Init writes the section
- **WHEN** `specctx init` writes `spec-ctx.toml`
- **THEN** the file has `[loop]`, `max_attempts = 3`, and `archive = "ask"`, each key with a comment line above it, and the file parses to the defaults

### Requirement: REQ-LOOP-004 Weak Verify needs a citation
`specctx next` SHALL treat a `weak-verify` finding in the files of the change as a citation gap. It SHALL return `cite` with that task in `task` and the reason `weak-verify <task> at <file>:<line>`, before it returns `start` or `work` for any task.

Refs: REQ-LOOP-001, REQ-CHK-005

#### Scenario: SCN-LOOP-004-1 Cite before start
- **WHEN** planning is complete and the first open task of the change has Verify: `true`
- **THEN** `next --json` prints `action: cite`, the task ID in `task`, and a reason that starts with `weak-verify`

#### Scenario: SCN-LOOP-004-2 A real command clears the gap
- **WHEN** the same task line gets Verify: `bun test tests/a.test.ts`
- **THEN** `next --json` prints `action: start` for that task

### Requirement: REQ-LOOP-005 Plan stop in the engine
`handoff ask --change <c> "<text>"` SHALL store the active change folder that matches `<c>` as the `task` of the question, in place of the current task. A `<c>` with no active change SHALL exit 2. While that question is open, `next` SHALL return `ask` with `human: true` for the change. `handoff resolve` SHALL end the stop. No new state file.

Refs: REQ-HND-002, REQ-LOOP-001, ADR-006

#### Scenario: SCN-LOOP-005-1 Plan stop blocks the change
- **WHEN** planning of `002-ids` is complete and `handoff ask --change 002 "plan ready for 002-ids. Approve to start the tasks?"` runs
- **THEN** `questions.json` gains an open question with `task: 002-ids`, and `next --json` prints `action: ask`, `human: true`, `task: null`, the question text as the reason, and the command `specctx handoff resolve <n> "<answer>"`

#### Scenario: SCN-LOOP-005-2 Resolve ends the stop
- **WHEN** the question of SCN-LOOP-005-1 is open and `handoff resolve <n> "yes"` runs, or `handoff ask --change 999 "x"` runs with no active change `999`
- **THEN** `next --json` prints the action of the next rule, such as `start`, and the unknown change exits 2 with no question written

### Requirement: REQ-LOOP-006 Fix reason
The reason of `next` for a failed Verify SHALL be `Verify failed (exit <e>): <line>`. `<line>` SHALL be the last line of the stderr tail that starts with `fail:`, `FAIL`, or `(fail)` after trimming. With no such line, it SHALL be the last non-empty line. With no non-empty line, it SHALL be `no output`.

Refs: REQ-LOOP-001, REQ-LOOP-002

#### Scenario: SCN-LOOP-006-1 Last fail line
- **WHEN** the newest fail file of the current task has the tail `$ bun test`, `fail: one`, `ok`, ` FAIL two`, `1 fail`
- **THEN** `next --json` prints `action: fix` with the reason `Verify failed (exit 1): FAIL two`

#### Scenario: SCN-LOOP-006-2 No fail line
- **WHEN** the tail is `first`, `last`, and an empty line
- **THEN** the reason ends with `: last`

#### Scenario: SCN-LOOP-006-3 Empty tail
- **WHEN** the tail is empty or holds only spaces
- **THEN** the reason ends with `: no output`

#### Scenario: SCN-LOOP-006-4 Bun failure tail
- **WHEN** the tail is a `bun test` failure: `(fail) adds [0.12ms]`, an `error:` line, ` 1 fail`, and `Ran 28 tests across 4 files.`
- **THEN** the reason ends with `: (fail) adds [0.12ms]`, and the attempt-cap question quotes the same line

#### Scenario: SCN-LOOP-006-5 Last of mixed prefixes
- **WHEN** the tail holds `FAIL one`, then `  (fail) two`, then `fail: three`, then `ok`
- **THEN** the reason ends with `: fail: three`

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

### Requirement: REQ-LOOP-008 Stale evidence in next
`next` SHALL return `repair` when a `[x]` task has evidence that names a changed file. It comes after the current task rule and before the open task rule. `task` SHALL be the earliest stale task and `tasks` SHALL list all of them. `reason` SHALL join `stale-evidence <t> <file>` per task with `, `. `command` SHALL join `specctx task reopen <t> "stale evidence: <file>" && specctx task done <t>` per task with ` && `. A current task keeps `work` or `fix`.

Refs: REQ-LOOP-001, REQ-CHK-003, ADR-004

#### Scenario: SCN-LOOP-008-1 Earliest stale task
- **WHEN** tasks 1.1 and 1.2 of `002-ids` have `[x]` and evidence that names `src/a.ts`. Then `src/a.ts` changes, and task 2.1 is open with no current task
- **THEN** `next --json` prints `action: repair`, `task: 002/1.1`, `tasks: ["002/1.1", "002/1.2"]`, `state: evidence_stale`, and the reason `stale-evidence 002/1.1 src/a.ts, stale-evidence 002/1.2 src/a.ts`. The command holds the reopen and done pair of `002/1.1`, then ` && `, then the pair of `002/1.2`

#### Scenario: SCN-LOOP-008-2 Current task first
- **WHEN** the tree of SCN-LOOP-008-1 has task 2.1 as the current task
- **THEN** `next --json` prints `action: work` for `002/2.1`, and after the command of SCN-LOOP-008-1 runs with a passing Verify, `next` no longer prints `repair` for `002/1.1`

#### Scenario: SCN-LOOP-008-3 One stale task
- **WHEN** only task 1.2 of `002-ids` has stale evidence
- **THEN** `next --json` prints `task: 002/1.2`, `tasks: ["002/1.2"]`, the reason `stale-evidence 002/1.2 src/a.ts`, and the command of that one task with no ` && `

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

### Requirement: REQ-LOOP-010 Stale tasks named under a current task
When a current task makes `next` return `work`, `fix`, or the attempt cap `ask`, and `[x]` tasks have stale evidence, `reason` SHALL end with `stale waiting: <t>, <t>`. A fail reason comes first, then a period and a space. `action`, `task`, `tasks`, and `command` SHALL not change.

Refs: REQ-LOOP-008, REQ-LOOP-006

#### Scenario: SCN-LOOP-010-1 Work names the stale tasks
- **WHEN** tasks 1.1 and 1.2 of `002-ids` have stale evidence and task 2.1 is current with no fail file
- **THEN** `next --json` prints `action: work`, `task: 002/2.1`, `tasks: ["002/2.1"]`, and the reason `stale waiting: 002/1.1, 002/1.2`

#### Scenario: SCN-LOOP-010-2 Fix keeps its reason first
- **WHEN** task 1.1 has stale evidence and task 2.1 is current with a failed Verify that ends in `FAIL two`
- **THEN** the reason is `Verify failed (exit 1): FAIL two. stale waiting: 002/1.1`

### Requirement: REQ-LOOP-011 Rerun line is not the gate
`next` SHALL judge the gate from the last line of `.ctx/gate-log.jsonl` whose `steps` is not exactly `["rerun"]`. The line counts only when `ok` is true and `strict` is true. A line without a `strict` key SHALL not count. A line from `gate --rerun` SHALL never count as a passing gate.

Refs: REQ-LOOP-001, REQ-CLI-009

#### Scenario: SCN-LOOP-011-1 Rerun after a failed gate
- **WHEN** every task has `[x]` and evidence, the last gate line has `ok: false`, and a later `rerun` line has `ok: true`
- **THEN** `next --json` prints `action: gate`

#### Scenario: SCN-LOOP-011-2 Rerun after a passing gate
- **WHEN** a passing gate line follows the newest evidence and a later `rerun` line has `ok: false`
- **THEN** `next --json` does not print `action: gate`

#### Scenario: SCN-LOOP-011-3 Non-strict pass
- **WHEN** every task has `[x]` and evidence, and the last gate line has `ok: true` and `strict: false` or no `strict` key
- **THEN** `next --json` prints `action: gate`

### Requirement: REQ-LOOP-012 Human tasks line
The human form of `next` SHALL print `tasks: none` for an empty list. Otherwise it SHALL print the IDs joined with a comma and a space. The JSON form SHALL not change.

Refs: REQ-LOOP-001

#### Scenario: SCN-LOOP-012-1 Empty list
- **WHEN** `next` runs without `--json` and no task is named
- **THEN** the output holds the line `tasks: none` and no line ends in a space

#### Scenario: SCN-LOOP-012-2 Several tasks
- **WHEN** `next` names the stale tasks `001/1.1` and `001/1.2`
- **THEN** the output holds the line `tasks: 001/1.1, 001/1.2`

### Requirement: REQ-LOOP-013 Repair needs a Verify command
`next` SHALL return `repair` for a ticked task without evidence only when the task line has a Verify command. A ticked task without one SHALL never get `repair`. When the baseline holds its `task-without-verify`, `next` SHALL skip it. Else the citation step returns `cite` for it.

Refs: REQ-LOOP-001, REQ-CHK-002

#### Scenario: SCN-LOOP-013-1 Baselined task without Verify
- **WHEN** a task is `[x]`, has no evidence and no Verify command, and the baseline holds `task-without-verify` for it
- **THEN** `next` does not name that task and moves to the next step

#### Scenario: SCN-LOOP-013-2 Task without Verify and no baseline
- **WHEN** a task is `[x]`, has no evidence and no Verify command, and the baseline does not hold it
- **THEN** `next` prints `action: cite` for it and never `repair`

#### Scenario: SCN-LOOP-013-3 Never repair without Verify
- **WHEN** a `[x]` task has no Verify command and the baseline holds only `done-without-evidence` for it
- **THEN** `next` prints `action: cite` for it and no `repair`

#### Scenario: SCN-LOOP-013-4 Ticked task with Verify still repairs
- **WHEN** a task is `[x]`, has a Verify command, and has no evidence
- **THEN** `next` prints `action: repair` with `task done <t>`

### Requirement: REQ-LOOP-014 Cap question closes with the task
A passing `task done` SHALL resolve the open attempt-cap question of that task with an answer that says Verify passed. `task done` SHALL write that question with `stage: "cap"`. It matches by `task` and stage `cap`, never by text. A question with no stage SHALL stay open. So SHALL a plan, design, or archive question. `next` SHALL not return `ask` for the task after it passes.

Refs: REQ-LOOP-002, REQ-HND-002

#### Scenario: SCN-LOOP-014-1 Cap question resolves on pass
- **WHEN** a task failed Verify at the cap, so one question with `stage: "cap"` is open, and a later `task done` passes
- **THEN** `task done` resolves that question with an answer that says Verify passed, and `next` no longer returns `ask` for the task

#### Scenario: SCN-LOOP-014-2 Other questions stay open
- **WHEN** a plan, design, or archive question is open for the change, or a plain `handoff ask` made a question with no stage, and `task done` passes
- **THEN** every one of these questions stays open

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
