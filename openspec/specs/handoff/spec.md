# handoff Specification

## Purpose
The file a fresh session reads first. Generated, so it is never stale by omission.

## Requirements

### Requirement: REQ-HND-001 Generated handoff
`specctx handoff write` SHALL write `.ctx/handoff.md` with sections: `change`, `current` (from `.ctx/current.json`), `done` (tasks with evidence since the last handoff), `reopened`, `open_questions` and `resolved` (from `.ctx/questions.json`), `next` (output of `task next`). The `resolved` list SHALL show the last 10 entries and one line `and <n> more in .ctx/questions.json` when more exist. It SHALL be idempotent: two runs without changes produce the same file.

Refs: ADR-004, ADR-006

#### Scenario: SCN-HND-001-1 Sections present
- **WHEN** `handoff write` runs after two tasks were done
- **THEN** the file has every section and `done` lists both task IDs

#### Scenario: SCN-HND-001-2 Idempotent
- **WHEN** `handoff write` runs twice without changes
- **THEN** the file is byte-identical

### Requirement: REQ-HND-002 Open questions
`.ctx/questions.json` SHALL hold a JSON list sorted by `n` of `{n, asked_at, task, text, status, answer?, resolved_at?}`. `status` is `open` or `resolved`. `handoff ask "<text>"` SHALL append an open question with the next `n`, the current task, and the time. `handoff resolve <n> "<answer>"` SHALL resolve question `n` with the answer and the time. No command SHALL read `handoff.md` for questions. `handoff write` SHALL migrate an old `handoff.md` once, when the file is absent.

Refs: ADR-006

#### Scenario: SCN-HND-002-1 Ask and resolve
- **WHEN** `handoff ask "exit 1 or 2?"` then `handoff resolve 1 "exit 2"` run
- **THEN** `open_questions` is empty and `resolved` has the question and the answer

#### Scenario: SCN-HND-002-2 Ask writes the file
- **WHEN** `handoff ask "first?"` runs with current task `002/3.1`
- **THEN** `questions.json` holds one object with `n` 1, `task` `002/3.1`, `status` `open`, an `asked_at` time, and the output reads `open question 1 added`

#### Scenario: SCN-HND-002-3 Resolve by number
- **WHEN** questions 1 and 2 are open and `handoff resolve 1 "yes"` runs
- **THEN** question 1 is `resolved` with `answer` `yes` and a `resolved_at` time, question 2 stays open, `handoff.md` lists `Q2` under `open_questions`, and `handoff resolve 1 "again"` exits 2 with `no open question 1`

#### Scenario: SCN-HND-002-4 Migrate once
- **WHEN** `questions.json` is absent and `handoff.md` holds one `open_questions` item and two `resolved` items
- **THEN** `handoff write` writes the three into `questions.json`, prints `migrated 3 question(s) to .ctx/questions.json`, and a second run prints no `migrated` line

### Requirement: REQ-HND-003 Status reads the handoff
`specctx status` SHALL print the `current` task from the handoff when the file exists and the count of `open_questions` from `.ctx/questions.json`.

Refs: REQ-CLI-001

#### Scenario: SCN-HND-003-1 Status line
- **WHEN** the handoff has one open question and current task `002/3.1`
- **THEN** `status` prints `current: 002/3.1` and `open_questions: 1`

### Requirement: REQ-HND-004 Verdict on plan and archive questions
`handoff resolve <n> --approve|--reject "<answer>"` SHALL store `verdict: approved` or `verdict: rejected`. For a question with `stage: plan` or `stage: archive`, a resolve with neither flag, or with both, SHALL exit 2 and print one line that names `--approve` and `--reject`. The question stays open. Questions of other stages SHALL resolve as before and store no verdict.

Refs: REQ-HND-002, REQ-LOOP-007, REQ-LOOP-009

#### Scenario: SCN-HND-004-1 Approve and reject
- **WHEN** an open question has `stage: plan`, and `handoff resolve 1 --approve "yes"` runs. Then an open question 2 has `stage: archive`, and `handoff resolve 2 --reject "Not yet, one task is weak"` runs
- **THEN** question 1 stores `verdict: approved`, question 2 stores `verdict: rejected`, and both closed with their answers

#### Scenario: SCN-HND-004-2 A plain resolve exits 2
- **WHEN** an open question has `stage: plan` or `stage: archive`, and `handoff resolve <n> "yes"` runs, or runs with both flags
- **THEN** it exits 2, stderr is one line that names `--approve` and `--reject`, and the question stays open

#### Scenario: SCN-HND-004-3 Other stages unchanged
- **WHEN** an open question has `stage: design`, or no stage, and `handoff resolve <n> "redis"` runs
- **THEN** it exits 0, the question closes, and it stores no `verdict`
