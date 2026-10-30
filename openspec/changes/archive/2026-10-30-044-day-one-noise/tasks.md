# Tasks

Run `bun run build` before every Verify. Tests write only under a temp dir, clear `SPECCTX_RERUN` before they run the CLI or a script, and never reach the network. They set `SPECCTX_OPENSPEC` to `/bin/true` or to `tests/fixtures/openspec-stub.sh`. A task that edits a `.ts` file also runs `bun run typecheck`. `CHANGELOG.md` and `docs/verification/044.md` change only in task 5.1.

## 1. Archived tasks are not findings

- [x] 1.1 In `src/index/scan.ts`, skip `task-without-req` and `task-without-verify` when `rpath` has `/archive/`, per 044/D1. Write `tests/check/archived-tasks.test.ts` for SCN-CHK-001-8: an archived and an active `tasks.md` with the same bare task line, then `check` and the `problems` of `index.json`. A grep of `tests/` shows that `tests/check/base.test.ts`, `tests/baseline/baseline.test.ts`, `tests/stats/metrics.test.ts`, `tests/adopt/write.test.ts`, and `tests/parity/run.sh` read these rules. The parity goldens `check.out`, `check-strict.out`, and `index.json` name only the active change `007`, so no golden changes. [REQ-CHK-001] Verify: `bun run build && bun test tests/check tests/baseline tests/stats tests/adopt tests/index && bash tests/parity/run.sh && bun run typecheck`

## 2. Repair needs a Verify command

- [x] 2.1 In `src/loop/next.ts`, make step 5 take a ticked task without evidence only when `parseVerify` gives a command, per 044/D2. Write `tests/loop/repair-verify.test.ts` for SCN-LOOP-013-1 to SCN-LOOP-013-4. It uses a stub OpenSpec status. The cases are a baselined task, an unbaselined task, a task with `done-without-evidence` baselined only, and a ticked task with a Verify command. A grep of `tests/` shows that `tests/loop/next.test.ts` (SCN-LOOP-001-3), `tests/loop/stale.test.ts`, and `tests/cli/run-prefix.test.ts` print `repair` for tasks with a Verify command, so they stay as they are. [REQ-LOOP-013] Verify: `bun run build && bun test tests/loop tests/cli tests/baseline && bun run typecheck`

## 3. The cap question closes with the task

- [x] 3.1 Add `cap` to `QuestionStage` in `src/handoff/questions.ts`, make `addQuestion` callers in `task done` pass `cap`, add `isCapQuestion` to `src/loop/fails.ts`, and call it from the passing branch of `task done` in `src/cli/workflow.ts`, per 044/D3. Write `tests/loop/cap-resolve.test.ts` for SCN-LOOP-014-1 and SCN-LOOP-014-2. The cases are a task that fails to the cap and then passes. Another case is a plain `handoff ask` during the task, which stays open. A third case keeps open plan, design, and archive questions open, and a reworded cap question still resolves. A grep of `tests/` shows that `tests/loop/fails.test.ts` and `tests/handoff/` read `questions.json` after a cap, so they stay as they are. [REQ-LOOP-014, REQ-LOOP-002] Verify: `bun run build && bun test tests/loop tests/handoff tests/tasks && bun run typecheck`

## 4. The baseline step after adopt

- [x] 4.1 In `src/adopt/write.ts`, print the commit note and `next: <run> baseline write` after the `adopted` line when headers changed, per 044/D4. Write `tests/adopt/baseline-hint.test.ts` for SCN-ADOPT-002-5 and SCN-ADOPT-002-6, with `[cli] run` set in one case. The cases cover the no-ID fixture, a second run, and `--dry-run`, and none writes `.ctx/baseline.json`. A grep of `tests/` shows that `tests/adopt/write.test.ts` checks the `adopted` line with `toContain`, and `tests/cli/run-source.test.ts` skips `src/adopt/write.ts`. [REQ-ADOPT-002] Verify: `bun run build && bun test tests/adopt tests/cli tests/paths && bun run typecheck`

## 5. Docs

- [x] 5.1 Add the entries under `## Unreleased` in `CHANGELOG.md`. Write `docs/verification/044.md` like `docs/verification/043.md`. Both pass both lints. [REQ-CHK-001, REQ-LOOP-013, REQ-LOOP-014, REQ-ADOPT-002] Verify: `bun run build && node dist/cli.js lint tells --baseline 0 docs/verification/044.md CHANGELOG.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation docs/verification/044.md CHANGELOG.md && grep -q "044" CHANGELOG.md && grep -q "^## Unreleased" CHANGELOG.md`
