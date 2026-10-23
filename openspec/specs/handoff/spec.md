# handoff Specification

## Purpose
The file a fresh session reads first. Generated, so it is never stale by omission.

## Requirements

### Requirement: REQ-HND-001 Generated handoff
`specctx handoff write` SHALL write `.ctx/handoff.md` with sections: `change`, `current` (from `.ctx/current.json`), `done` (tasks with evidence since the last handoff), `reopened`, `open_questions` (carried from the previous file plus new ones), `next` (output of `task next`). It SHALL be idempotent: two runs without changes produce the same file.

Refs: ADR-004

#### Scenario: SCN-HND-001-1 Sections present
- **WHEN** `handoff write` runs after two tasks were done
- **THEN** the file has every section and `done` lists both task IDs

#### Scenario: SCN-HND-001-2 Idempotent
- **WHEN** `handoff write` runs twice without changes
- **THEN** the file is byte-identical

### Requirement: REQ-HND-002 Open questions
`specctx handoff ask "<text>"` SHALL append one item under `open_questions` with the current task id and date. `specctx handoff resolve <n> "<answer>"` SHALL move item n to `resolved` with the answer.

#### Scenario: SCN-HND-002-1 Ask and resolve
- **WHEN** `handoff ask "exit 1 or 2?"` then `handoff resolve 1 "exit 2"` run
- **THEN** `open_questions` is empty and `resolved` has the question and the answer

### Requirement: REQ-HND-003 Status reads the handoff
`specctx status` SHALL print the `current` task and the count of `open_questions` from the handoff when the file exists.

Refs: REQ-CLI-001

#### Scenario: SCN-HND-003-1 Status line
- **WHEN** the handoff has one open question and current task `002/3.1`
- **THEN** `status` prints `current: 002/3.1` and `open_questions: 1`
