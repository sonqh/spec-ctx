# Spec Delta

## ADDED Requirements

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
The reason of `next` for a failed Verify SHALL be `Verify failed (exit <e>): <line>`. `<line>` SHALL be the last line of the stderr tail that starts with `fail:` or `FAIL` after leading spaces. With no such line, it SHALL be the last non-empty line. With no non-empty line, it SHALL be `no output`.

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

## MODIFIED Requirements

### Requirement: REQ-LOOP-001 Next command
`specctx next [--json] [--change <c>]` SHALL read the files and write none. `--json` prints one object with the sorted keys `action`, `attempt`, `change`, `command`, `human`, `max_attempts`, `reason`, `state`, `task`. `action` SHALL be one of `plan`, `cite`, `start`, `work`, `fix`, `repair`, `gate`, `archive`, `ask`, `stop`. Planning state comes from OpenSpec `status --json`. The human form prints `action:` first and ends with `next: <command>`.

Refs: ADR-006, REQ-CLI-007, REQ-LOOP-002

#### Scenario: SCN-LOOP-001-1 Closed enum
- **WHEN** `next --json` runs on a project in every state of the decision order
- **THEN** every `action` is in the list of ten and every object has the nine keys in sorted order. No file under `.ctx/` changes except the index cache

#### Scenario: SCN-LOOP-001-2 Plan states
- **WHEN** no folder exists under `openspec/changes/` except `archive`, or the OpenSpec status reports `isPlanningComplete: false`, or the OpenSpec command exits 1
- **THEN** `next` prints `action: plan` with `human: true` and the command `<openspec> new change <name>`, then `action: plan` with `nextSteps[0]` as the command, then `action: stop` with a reason that starts with `openspec status failed`

#### Scenario: SCN-LOOP-001-3 Task states
- **WHEN** planning is complete and the change moves through five states. First a task with no REQ. Then a `[x]` task with no evidence. Then a current task with no fail file. Then a current task with one fail file. Then an open task with no current task
- **THEN** `next` prints `cite` with `specctx query --change <c> --kind req`, then `repair` with `specctx task done <t>`, then `work` with `specctx task done <t>`. Then `fix` with `attempt: 1` and the reason of REQ-LOOP-006. Then `start` with `specctx task start <t>`

#### Scenario: SCN-LOOP-001-4 Finish states
- **WHEN** every task has `[x]` and evidence, and `.ctx/gate-log.jsonl` has no `ok: true` line after the newest evidence, then has one. Then an open question names a task of the change
- **THEN** `next` prints `gate` with `specctx gate --strict`, then `archive` with `<openspec> archive <c> -y` and `human: true` under `[loop] archive = "ask"` or `human: false` under `"auto"`, and `ask` with `human: true` and the question text as the reason before any other rule
