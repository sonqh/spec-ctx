# Spec Delta

## MODIFIED Requirements


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
