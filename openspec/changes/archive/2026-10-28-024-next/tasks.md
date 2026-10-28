# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root. No test reaches the network.

## 1. Fail files and config

- [x] 1.1 `Config.loop` with `max_attempts` and `archive`, the loader errors, and the `[loop]` section of `INIT_TEXT`, per 024/D6. Tests for SCN-LOOP-003-1 to SCN-LOOP-003-4 and SCN-DIST-002-11 in `tests/config.test.ts`. The key count of SCN-DIST-002-2 goes to 16. [REQ-LOOP-003, REQ-DIST-002] Verify: `bun run build && bun test tests/config.test.ts`
- [x] 1.2 `task done` writes the fail file on a non zero exit, counts the window, and appends the question at the cap, per 024/D4 and 024/D5. `listEvidence` and the evidence reader of `stats` skip the fail pattern. Tests for SCN-LOOP-002-1 to SCN-LOOP-002-4 in `tests/loop/fails.test.ts` and SCN-TASK-003-8, SCN-TASK-003-9 in `tests/tasks/done.test.ts`. [REQ-LOOP-002, REQ-TASK-003] Verify: `bun run build && bun test tests/loop/fails.test.ts tests/tasks tests/stats tests/check tests/handoff`

## 2. Next command

- [x] 2.1 `specctx next` in `src/loop/next.ts` with the decision order of 024/D2, the OpenSpec call of 024/D3, and the output of 024/D1. Add the flag in `args.ts` and the help record under `Read`, per 024/D7. Golden tests per state, the closed enum test, and the human form test in `tests/loop/next.test.ts`, per 024/D8. SCN-CLI-001-8 in `tests/cli/help.test.ts`. Record the help golden again. [REQ-LOOP-001, REQ-CLI-001] Verify: `bun run build && bun test tests/loop tests/cli && node dist/cli.js next | node dist/cli.js lint ste --baseline 0`

## 3. Record

- [x] 3.1 Add the change to the unreleased section of `CHANGELOG.md`. The README command table gets `next` and the config reference gets `[loop]`. Write `docs/verification/024.md` with the output of `next` and `next --json` on this repository. Full gate. [REQ-GOV-001] Verify: `bun run ci:local`

## Workflow follow-up

- Archive with `npx -y @fission-ai/openspec@latest archive 024-next -y`, then `build`, `handoff write`, `stats --write`.
