# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. The skill and the archive guidance

- [x] 1.1 Add the two overrides of `openspec-propose` and the stale route of the `gate` bullet to `skills/specctx-run/SKILL.md`, per 033/D6. Change the rebuild line of `openspec/config.yaml`, per 033/D7. Add the tests for SCN-SKL-005-1 to SCN-SKL-005-3 in `tests/skills/overrides.test.ts` and update `tests/gov/archive-guidance.test.ts` for SCN-GOV-009-1. [REQ-SKL-005, REQ-GOV-009] Verify: `bun run build && bun test tests/skills tests/gov/archive-guidance.test.ts`

## 2. All stale tasks in one turn

- [x] 2.1 Add the `tasks` key to `Decision`, `KEYS`, and `decideNext`, and join the stale tasks in `reason` and `command`, per 033/D1. Update the full-object tests of `next` and add the tests for SCN-LOOP-008-1 and SCN-LOOP-008-3 in `tests/loop/stale.test.ts`. [REQ-LOOP-001, REQ-LOOP-008] Verify: `bun run build && bun test tests/loop tests/tasks tests/cli`

## 3. The cap question

- [x] 3.1 Make `capQuestion` quote `failLine`, per 033/D2. Add the test for SCN-LOOP-002-5 in `tests/loop/fails.test.ts` and update SCN-LOOP-002-2. [REQ-LOOP-002, REQ-LOOP-006] Verify: `bun run build && bun test tests/loop/fails.test.ts tests/tasks`

## 4. One config error shape

- [x] 4.1 Add `loadConfigOrExit` in `src/cli/config.ts` and call it from `run`, `bracketsOf`, and `applyAdopt`, per 033/D4. Put the path of the file in the TOML message. Add the tests for SCN-DIST-009-1 to SCN-DIST-009-3 in `tests/config.test.ts`. [REQ-DIST-009, REQ-DIST-002] Verify: `bun run build && bun test tests/config.test.ts tests/init tests/adopt tests/cli`

## 5. The dangling-ref hint

- [x] 5.1 Change the `dangling-ref` hint in `src/check/hints.ts`, per 033/D3. Record the parity golden. Add the tests for SCN-CHK-007-1 and SCN-CHK-007-2 in `tests/check/hint.test.ts`. [REQ-CHK-007, REQ-CHK-006] Verify: `bun run build && bun test tests/check && bash tests/parity/run.sh`

## 6. The UTC date

- [x] 6.1 Comment `today()` as UTC and add the test for SCN-STAT-005-6 in `tests/stats/cli.test.ts`, per 033/D5. [REQ-STAT-005] Verify: `bun run build && bun test tests/stats`

## Workflow follow-up

- Run the steps under `operations.archive.guidance` in `openspec/config.yaml`.
- Archive with the command that `specctx next` prints.
- Run `npx -y @fission-ai/openspec@latest validate --all --strict` again before push.
