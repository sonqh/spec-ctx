## ADDED Requirements

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
