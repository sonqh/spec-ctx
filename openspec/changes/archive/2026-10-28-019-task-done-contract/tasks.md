# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. Close the bypasses

- [x] 1.1 `task done --manual` exits 2 on a task with a Verify code span, per 019/D1. Add a test for SCN-TASK-003-5 in `tests/tasks/done.test.ts`. [REQ-TASK-003] Verify: `bun run build && bun test tests/tasks/done.test.ts`
- [x] 1.2 The repair path for a hand tick, per 019/D2. Add a test for SCN-TASK-003-6 in `tests/tasks/done.test.ts`. [REQ-TASK-003] Verify: `bun run build && bun test tests/tasks/done.test.ts tests/check/evidence.test.ts`
- [x] 1.3 `task start` freezes the Verify command in `.ctx/current.json` and `task done` refuses a changed one, per 019/D3. Add tests for SCN-TASK-002-5 in `tests/tasks/start.test.ts` and SCN-TASK-003-7 in `tests/tasks/done.test.ts`. Keep SCN-TASK-002-1 in sync. [REQ-TASK-002, REQ-TASK-003] Verify: `bun run build && bun test tests/tasks`

## 2. Remove backfill

- [x] 2.1 Remove `task backfill` from `workflow.ts`, `args.ts`, and `help.ts`, per 019/D4. Drop the backfill branch inside `--manual` and update the hint. Retire REQ-TASK-006 and its scenarios. Delete `tests/tasks/backfill.test.ts` and move the baseline and help tests off backfill, per 019/D5. Re-record the help golden. [REQ-CLI-001, REQ-TASK-003] Verify: `bun run build && bun test tests/tasks tests/baseline tests/cli && node dist/cli.js --help | node dist/cli.js lint ste --baseline 0 && ! grep -rn backfill src/`

## 3. Record

- [x] 3.1 Drop the `task backfill` line from `tests/paths/existing.sh` and the README existing path, per 019/D6. Add the change to the unreleased section of `CHANGELOG.md`. Write `docs/verification/019.md`. Full gate. [REQ-ADOPT-006, REQ-GOV-001] Verify: `bun run ci:local`

## Workflow follow-up

- Archive with `npx -y @fission-ai/openspec@latest archive 019-task-done-contract -y`, then `build`, `handoff write`, `stats --write`.
