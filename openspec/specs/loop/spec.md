# loop Specification

## Purpose
The closed loop of ADR-006. One read command names the next action from the files on disk. A fail file records every failed Verify run. A cap stops the loop and asks a human.

## Requirements

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
- **THEN** `next` prints `cite` with `specctx query --change <c> --kind req`, then `repair` with `specctx task done <t>`, then `work` with `specctx task done <t>`. Then `fix` with `attempt: 1` and the reason `Verify failed (exit <e>): <first line of the tail>`. Then `start` with `specctx task start <t>`

#### Scenario: SCN-LOOP-001-4 Finish states
- **WHEN** every task has `[x]` and evidence, and `.ctx/gate-log.jsonl` has no `ok: true` line after the newest evidence, then has one. Then an open question names a task of the change
- **THEN** `next` prints `gate` with `specctx gate --strict`, then `archive` with `<openspec> archive <c> -y` and `human: true` under `[loop] archive = "ask"` or `human: false` under `"auto"`, and `ask` with `human: true` and the question text as the reason before any other rule

### Requirement: REQ-LOOP-002 Fail files and the attempt cap
A non zero Verify exit in `task done` SHALL write `.ctx/evidence/<c>/<t>.fail-<n>.json` with the keys `at`, `attempt`, `stderr_tail`, `task`, `verify`. `attempt` SHALL be the fail files of the task since `current.json.started_at` plus one. A resolved question for the task resets the count. At `[loop] max_attempts`, `task done` SHALL append a question and print a `blocked:` line. No command SHALL read a fail file as evidence.

Refs: ADR-006, REQ-TASK-003, REQ-HND-002

#### Scenario: SCN-LOOP-002-1 First failure
- **WHEN** `task start 002/2.2` ran and the Verify command of `002/2.2` exits 1
- **THEN** `.ctx/evidence/002/2.2.fail-1.json` exists with `attempt: 1`, `task: 002/2.2`, `verify.exit: 1`, and the printed tail under `stderr_tail`, no `.ctx/evidence/002/2.2.json` exists, and `task done` exits 1

#### Scenario: SCN-LOOP-002-2 Cap reached
- **WHEN** `[loop] max_attempts = 3` and the third `task done 002/2.2` since `task start` fails
- **THEN** `.ctx/questions.json` gains an open question with `task: 002/2.2` and the text `task 002/2.2 failed Verify 3 times. Last: <first line of the tail>. What should change?`, the last line is `blocked: question <k> written. Run specctx handoff resolve <k> "<answer>" to continue.`. A fourth run adds no second question. The exit code is 1

#### Scenario: SCN-LOOP-002-3 Attempt window
- **WHEN** two fail files of `002/2.2` exist from before `current.json.started_at`, or `handoff resolve` closed the question of the cap
- **THEN** the next failure writes `attempt: 1`, and without `current.json` every fail file of the task counts

#### Scenario: SCN-LOOP-002-4 Fail files are not evidence
- **WHEN** `.ctx/evidence/002/2.2.fail-1.json` exists and `002/2.2` is open
- **THEN** `check --strict` reports no `evidence-without-done` for it, `stats` counts no evidence for `002`, and a later passing `task done 002/2.2` writes `2.2.json` and keeps `2.2.fail-1.json`

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
