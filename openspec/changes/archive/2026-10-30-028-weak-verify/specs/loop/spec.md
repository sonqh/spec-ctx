## ADDED Requirements

### Requirement: REQ-LOOP-004 Weak Verify needs a citation
`specctx next` SHALL treat a `weak-verify` finding in the files of the change as a citation gap. It SHALL return `cite` with that task in `task` and the reason `weak-verify <task> at <file>:<line>`, before it returns `start` or `work` for any task.

Refs: REQ-LOOP-001, REQ-CHK-005

#### Scenario: SCN-LOOP-004-1 Cite before start
- **WHEN** planning is complete and the first open task of the change has Verify: `true`
- **THEN** `next --json` prints `action: cite`, the task ID in `task`, and a reason that starts with `weak-verify`

#### Scenario: SCN-LOOP-004-2 A real command clears the gap
- **WHEN** the same task line gets Verify: `bun test tests/a.test.ts`
- **THEN** `next --json` prints `action: start` for that task
