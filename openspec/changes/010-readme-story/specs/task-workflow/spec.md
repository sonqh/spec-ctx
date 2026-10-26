# task-workflow (delta)

## MODIFIED Requirements

### Requirement: REQ-TASK-003 Done
`specctx task done <id>` SHALL parse the task's Verify command, run it in the project root, and on exit 0 write `.ctx/evidence/<change>/<task>.json` and change `[ ]` to `[x]` on that task line only. On a non-zero exit it SHALL write nothing, print the last 20 lines of output, then `Verify failed (exit <n>). The task stays open.`, and exit 1. `--manual "<note>"` SHALL be required when the task has no Verify command.

Refs: ADR-004, REQ-VER-001

#### Scenario: SCN-TASK-003-1 Passing verify
- **WHEN** the Verify command exits 0
- **THEN** the task line is `[x]`, the evidence file exists, and the rest of `tasks.md` is byte-identical

#### Scenario: SCN-TASK-003-2 Failing verify
- **WHEN** the Verify command exits 1
- **THEN** `tasks.md` is unchanged, no evidence file exists, the last line is `Verify failed (exit 1). The task stays open.`, and `task done` exits 1

#### Scenario: SCN-TASK-003-3 Manual evidence
- **WHEN** the task has prose Verify and `--manual "reviewed output by eye"` is given
- **THEN** the evidence has `kind: manual` and the note

#### Scenario: SCN-TASK-003-4 Manual required
- **WHEN** the task has prose Verify and no `--manual`
- **THEN** it exits 2 and says a `--manual` note is required
