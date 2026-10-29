# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. The weak-verify rule

- [x] 1.1 Add `isWeakVerify` to `src/verify/parse.ts`, per 028/D1. Add `weakVerifyFindings` and `weakVerifyWarnings` to `src/check/check.ts` and wire both modes, per 028/D2 and 028/D3. Count the warning file in `checkText` of `src/cli/commands.ts`, per 028/D4. Add the rule and its hint to `src/check/hints.ts`, per 028/D5. Add the rule to `BASELINE_RULES` and change `warningKey` in `src/baseline/baseline.ts`, per 028/D6 and 028/D10. Add the tests for SCN-CHK-005-1 to SCN-CHK-005-6 in `tests/check/weak.test.ts`. Change a `true` Verify in `tests/check/` only where a test fails, per 028/D9. [REQ-CHK-005, REQ-ADOPT-005] Verify: `bun run build && bun test tests/check tests/verify tests/baseline`
- [x] 1.2 Add `weak-verify` to `CITE_RULES` and `TASK_RULES` in `src/loop/next.ts`, per 028/D7. Add the tests for SCN-LOOP-004-1 and SCN-LOOP-004-2 in `tests/loop/next.test.ts`. Change a `true` Verify in `tests/loop/` only where a test fails, per 028/D9. [REQ-LOOP-004] Verify: `bun run build && bun test tests/loop`
- [x] 1.3 Record the parity goldens with `bash tests/parity/run.sh --record`, per 028/D8. Read the diff. It holds only the new `weak-verify` lines and the summary counts. [REQ-CHK-005, REQ-CHK-002] Verify: `bun run build && bash tests/parity/run.sh`
- [x] 1.4 Change a `true` Verify in the other test files only where a test fails, per 028/D9. Run `node dist/cli.js check --strict` on this repository and fix every task line that fires. Add no baseline entry. [REQ-CHK-005] Verify: `bun run build && bun test && node dist/cli.js check --strict`

## 2. Record

- [x] 2.1 Add the change to the unreleased section of `CHANGELOG.md`. Write `docs/verification/028.md` with the note on the parity goldens. Full gate. [REQ-GOV-001, REQ-CHK-005] Verify: `bun run ci:local`

## Workflow follow-up

- Archive with `npx -y @fission-ai/openspec@latest archive 028-weak-verify -y`, then `build`, `handoff write`, `stats --write`.
