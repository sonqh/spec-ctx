# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. The status next line

- [x] 1.1 Add `tests/fixtures/openspec-stub.sh` and set `SPECCTX_OPENSPEC` to it for `status` in `tests/helpers.ts`, per 030/D4. Pass the variable in the child env of `tests/cli/color.test.ts` and `tests/cli/startup.test.ts`. [REQ-CLI-007] Verify: `bun run build && bun test tests/cli/color.test.ts tests/cli/startup.test.ts`
- [x] 1.2 End `statusLines` in `src/cli/status.ts` with the command of `decideNext`, per 030/D1 and 030/D2. Remove `nextStep`. Pass the config and the index from `src/cli/commands.ts`. Change the test of SCN-CLI-007-2 and add the tests for SCN-CLI-007-5 to SCN-CLI-007-7 in `tests/cli/nextstep.test.ts`. Each test compares the last line of `status` with the command of `next --json`. [REQ-CLI-007, REQ-LOOP-001] Verify: `bun run build && bun test tests/cli tests/loop`
- [x] 1.3 Export the stub in `tests/parity/run.sh` and record the goldens with `run.sh --record`, per 030/D5. Change the `status` quote in `docs/getting-started.md`, per 030/D7. [REQ-DIST-003, REQ-CLI-007] Verify: `bun run build && bash tests/parity/run.sh && bun test tests/gov/getting-started.test.ts`

## 2. Archive guidance

- [x] 2.1 Add the six steps to `operations.archive.guidance` in `openspec/config.yaml`, per 030/D6. Add the test for SCN-GOV-009-1 in `tests/gov/archive-guidance.test.ts`. [REQ-GOV-009] Verify: `bun test tests/gov/archive-guidance.test.ts`

## Workflow follow-up

- Run the steps under `operations.archive.guidance` in `openspec/config.yaml`.
- Archive with the command that `specctx next` prints.
- Run `npx -y @fission-ai/openspec@latest validate --all --strict` again before push.
