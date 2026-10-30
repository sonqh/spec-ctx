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
- **THEN** `next` prints `gate` with `specctx gate --strict`, then `archive` with `human: true` and the command of REQ-LOOP-007 under `[loop] archive = "ask"`, or with `human: false` and `<openspec> archive <c> -y` under `"auto"`. Then `ask` with `human: true` and the question text as the reason before any other rule

## ADDED Requirements

### Requirement: REQ-LOOP-007 Archive stop in the engine
`handoff ask --change <c>` SHALL store `stage: archive` when every task of the change is `[x]`, and `stage: plan` otherwise. At the archive stop `next` SHALL return the command `specctx handoff ask --change <c> "archive <c>?"`. A resolved question with `stage: archive` for the change, resolved after its newest evidence, SHALL turn the stop into `archive` with `human: false`. No new state file. No match on question text.

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

### Requirement: REQ-LOOP-008 Stale evidence in next
`next` SHALL return `repair` for the earliest `[x]` task of the change whose evidence names a file with another digest. This rule comes after the current task rule and before the next open task rule. The `reason` SHALL be `stale-evidence <t> <file>`. The command SHALL be `specctx task reopen <t> "stale evidence: <file>" && specctx task done <t>`. A current open task SHALL keep its `work` or `fix` action.

Refs: REQ-LOOP-001, REQ-CHK-003, ADR-004

#### Scenario: SCN-LOOP-008-1 Earliest stale task
- **WHEN** tasks 1.1 and 1.2 of `002-ids` have `[x]` and evidence that names `src/a.ts`. Then `src/a.ts` changes, and task 2.1 is open with no current task
- **THEN** `next --json` prints `action: repair`, `task: 002/1.1`, `state: evidence_stale`, the reason `stale-evidence 002/1.1 src/a.ts`, and the command `specctx task reopen 002/1.1 "stale evidence: src/a.ts" && specctx task done 002/1.1`

#### Scenario: SCN-LOOP-008-2 Current task first
- **WHEN** the tree of SCN-LOOP-008-1 has task 2.1 as the current task
- **THEN** `next --json` prints `action: work` for `002/2.1`, and after the command of SCN-LOOP-008-1 runs with a passing Verify, `next` no longer prints `repair` for `002/1.1`
