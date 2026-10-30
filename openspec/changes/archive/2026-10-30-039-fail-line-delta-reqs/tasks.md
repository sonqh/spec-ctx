# Tasks

Run `bun run build` before every Verify. Tests write only under a temp dir, clear `SPECCTX_RERUN` before an in-process CLI run, and never reach the network.

## 1. The fail line

- [x] 1.1 In `src/loop/fails.ts`, add `(fail)` to the prefixes of `failLine`, per 039/D1. Keep the order and the fallback. Add tests in `tests/loop/fail-reason.test.ts` for SCN-LOOP-006-4 and SCN-LOOP-006-5, with a real `bun test` failure tail and a `capQuestion` check. Tests that encode the old rule: SCN-LOOP-006-1 to SCN-LOOP-006-3 in `tests/loop/fail-reason.test.ts`, the cap question in `tests/loop/fails.test.ts`, and the reason in `tests/loop/stale.test.ts`. They stay green. No golden changes. [REQ-LOOP-006] Verify: `bun run build && bun test tests/loop`

## 2. The delta requirement rule

- [x] 2.1 In `src/check/check.ts`, report `uncovered` for a delta requirement of an active change when its change has a task and no open task, per 039/D2. Reuse `tasksOf` and `pending` of the 038 code. Add `tests/check/delta-req.test.ts` for SCN-CHK-009-1 to SCN-CHK-009-5. Tests that touch the rule: `tests/check/delta.test.ts` and `tests/check/strict.test.ts`. The parity golden `tests/fixtures/parity-golden/check-strict.out` must not change. [REQ-CHK-009] Verify: `bun run build && bun test tests/check && tests/parity/run.sh`

## Workflow follow-up

- Run the steps under `operations.archive.guidance` in `openspec/config.yaml`.
- Archive with the command that `specctx next` prints.
- Run `npx -y @fission-ai/openspec@latest validate --all --strict` again before push.
