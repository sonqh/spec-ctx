# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. Ratchet

- [x] 1.1 `src/baseline/ratchet.ts` with `newEntries` and `baseAtMergeBase`, per 020/D2. Unit tests in `tests/baseline/ratchet.test.ts` for the set compare, the lint count compare, and the three skip reasons on a temp git repo. [REQ-ADOPT-008] Verify: `bun run build && bun test tests/baseline/ratchet.test.ts`
- [x] 1.2 The `baseline` gate step, the exception on the commit subject, `[gate] base` in `src/config.ts`, and `SPECCTX_BASELINE_SUBJECT`, per 020/D1, 020/D3, 020/D4, and 020/D5. Tests for SCN-ADOPT-008-1, SCN-ADOPT-008-2, SCN-ADOPT-008-3, and SCN-CLI-004-7 in `tests/cli/gate.test.ts`. Raise the key count of SCN-DIST-002-2 to 14. Update the help of `gate` in Strict mode and re-record the help golden. [REQ-ADOPT-008, REQ-CLI-004] Verify: `bun run build && bun test tests/cli tests/config.test.ts tests/baseline`

## 2. Record

- [x] 2.1 `fetch-depth: 0` in the `specs` job of `.github/workflows/ci.yml`, per 020/D6. The README existing path names the step and `[gate] base`. Add the change to the unreleased section of `CHANGELOG.md`. Write `docs/verification/020.md`. Full gate. [REQ-GOV-001, REQ-CLI-004] Verify: `bun run ci:local`

## Workflow follow-up

- Archive with `npx -y @fission-ai/openspec@latest archive 020-baseline-ratchet -y`, then `build`, `handoff write`, `stats --write`.
