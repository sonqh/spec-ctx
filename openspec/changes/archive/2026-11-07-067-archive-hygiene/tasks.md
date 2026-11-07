## 1. Purpose rules in check

- [x] 1.1 Write `tests/check/purpose.test.ts` for SCN-CHK-011-1 to SCN-CHK-011-4 with a temp project. It covers plain `check` and an archived delta. Add `src/check/purpose.ts`, the two rules with hints in `src/check/hints.ts`, and the calls in `src/check/check.ts`. The fixture `tests/fixtures/parity-repo` has a new capability delta `plant` with no Purpose, so the check-strict golden gains `delta-without-purpose plant`. Record it with `bash tests/parity/run.sh --record` and confirm with `git diff --stat tests/fixtures/parity-golden` that only `check-strict.*` changed. Do not edit the fixture. [REQ-CHK-011] Verify: `bun run build && bun test tests/check tests/index tests/gov && bun run typecheck && bash tests/parity/run.sh`

## 2. Archive refusal in next

- [x] 2.1 Write `tests/loop/purpose-stop.test.ts` for SCN-LOOP-019-1 and SCN-LOOP-019-2 with the OpenSpec stub of the test helpers. Add the step before the gate step in `src/loop/next.ts`. It calls `src/check/purpose.ts`. [REQ-LOOP-019] Verify: `bun run build && bun test tests/loop tests/cli tests/gate && bun run typecheck`

## 3. Stats write keeps old rows

- [x] 3.1 Write `tests/stats/append.test.ts` for SCN-STAT-009-1, SCN-STAT-009-2, SCN-STAT-009-3, SCN-STAT-009-4, SCN-STAT-010-1, SCN-STAT-010-2, and SCN-STAT-010-3. Add `src/stats/merge.ts` and the README edit. Change `src/stats/write.ts`, `src/stats/stats.ts` (the `specCharsOverride` argument), and the `stats` case of `src/cli/commands.ts`. `tests/stats/cli.test.ts` (SCN-STAT-005-3, SCN-STAT-005-6) and `tests/gov/readme.test.ts` (SCN-GOV-006-3) stay unchanged and must pass. [REQ-STAT-009, REQ-STAT-010, REQ-STAT-005] Verify: `bun run build && bun test tests/stats tests/gov && bun run typecheck`

## 4. Archive guidance

- [x] 4.1 Update `tests/gov/archive-guidance.test.ts` first. Then merge the two stats lines of `openspec/config.yaml` into one and add the Purpose line. The shipped init fragment holds apply guidance only, so `src/init/init.ts` stays. [REQ-GOV-009] Verify: `bun run build && bun test tests/gov/archive-guidance.test.ts tests/init tests/schema`

## 5. Docs and record

- [x] 5.1 Add the CHANGELOG entry under `## Unreleased`. Update the `check` and `stats` rows of `docs/reference.md`. Write `docs/verification/067.md` with both bugs before and after and the note on the check-strict golden record. [REQ-CHK-011, REQ-STAT-009] Verify: `node dist/cli.js lint tells --baseline 0 CHANGELOG.md docs/reference.md docs/verification/067.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation CHANGELOG.md docs/reference.md docs/verification/067.md && bun test tests/gov`
