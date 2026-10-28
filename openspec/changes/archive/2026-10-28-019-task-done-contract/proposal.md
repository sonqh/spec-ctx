# Proposal

## Why

ADR-006 item 6 names three bypasses in `task done`. The architecture review of 2026-10-28 found them. `task done <t> --manual "<note>"` closes a task that has a Verify command without a run. A task ticked by hand has no repair path, because `task done` refuses a `[x]` task with `task <t> is done`. And the Verify command that `task start` showed can change before `task done` runs it. ADR-004 says the box flips only after Verify passed. An autonomous loop turns every bypass into a habit, so they close before the loop ships. ADR-006 item 11 removes `task backfill` and REQ-TASK-006. The baseline rule `done-without-evidence` already covers legacy ticked tasks.

## What Changes

- `task done <t> --manual` exits 2 with `task <t> has a Verify command. Run it with specctx task done <t>.` when the task line has a Verify code span. `--manual` stays allowed for a task with no Verify span.
- `task done <t>` on a `[x]` task with no evidence runs Verify. Exit 0 writes the evidence and keeps the box. A non zero exit prints the failure text and leaves the box as it is. `task <t> is done` with exit 2 stays only when evidence exists.
- `task start` writes `verify` into `.ctx/current.json` beside `task`, `started_at`, and `bundle_chars`. `task done` exits 2 with `task <t>: the Verify command changed since task start. Run specctx task start <t> again.` when `current.json` names this task and its `verify` differs from `tasks.md`.
- `task backfill` goes: the command, its help entry, its test file, the line in `tests/paths/existing.sh`, the README existing path, and the hidden backfill branch inside `--manual`. REQ-TASK-006 is removed and retired with its scenarios.
- REQ-TASK-002 gets SCN-TASK-002-5. REQ-TASK-003 gets SCN-TASK-003-5, SCN-TASK-003-6, SCN-TASK-003-7. REQ-CLI-001 and REQ-ADOPT-006 drop `task backfill` from their lists.

Out of scope: the baseline ratchet against the merge base (ADR-006 item 6, fourth sentence) and the `retitle-needs-renamed` rule (item 7). They are changes 020 and 021.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `task-workflow`: REQ-TASK-002, REQ-TASK-003. REQ-TASK-006 removed.
- `cli`: REQ-CLI-001.
- `adopt-existing`: REQ-ADOPT-006.

## Impact

- `src/cli/workflow.ts`, `src/cli/help.ts`, `src/cli/args.ts`, `src/check/hints.ts`.
- `tests/tasks/done.test.ts`, `tests/tasks/start.test.ts`, `tests/baseline/baseline.test.ts`, `tests/cli/help.test.ts`, `tests/paths/existing.sh`, `tests/fixtures/help-golden/`. `tests/tasks/backfill.test.ts` goes.
- `README.md`, `CHANGELOG.md`, `decisions/retired-ids.md`.
