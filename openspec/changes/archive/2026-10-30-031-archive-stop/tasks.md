# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. The archive stop

- [x] 1.1 Add the optional `stage` field to `Question` in `src/handoff/questions.ts` and set it in `handoff ask --change` from the tasks of the change, per 031/D1. Add the tests for SCN-LOOP-007-2 in `tests/loop/archive-stop.test.ts`. [REQ-LOOP-007, REQ-HND-002] Verify: `bun run build && bun test tests/loop/archive-stop.test.ts tests/loop/plan-stop.test.ts tests/handoff`
- [x] 1.2 Change step 9 of `decideNext` in `src/loop/next.ts`, per 031/D2. Add the tests for SCN-LOOP-007-1 and SCN-LOOP-007-3 in `tests/loop/archive-stop.test.ts`. Change the test of SCN-LOOP-001-4 in `tests/loop/next.test.ts`. [REQ-LOOP-007, REQ-LOOP-001] Verify: `bun run build && bun test tests/loop tests/cli/nextstep.test.ts`

## 2. Stale evidence in next

- [x] 2.1 Add `staleOf` to `src/check/evidence.ts` and use it in `evidenceFindings`, per 031/D5. Add the stale rule after step 6 of `decideNext`, per 031/D4 and 031/D5. Add the tests for SCN-LOOP-008-1 and SCN-LOOP-008-2 in `tests/loop/stale.test.ts`. [REQ-LOOP-008, REQ-CHK-003] Verify: `bun run build && bun test tests/loop tests/check/evidence.test.ts`

## 3. Hints

- [x] 3.1 Add the optional `hint` field to `Finding`, print it in `checkText`, and drop it from `check --json`, per 031/D6. Build the retitle hint from the two header lines in `retitleFindings`, per 031/D7. Change the `stale-evidence` hint, per 031/D8. Add the tests for SCN-CHK-006-1 to SCN-CHK-006-3 in `tests/check/hint.test.ts`. Change the retitle hint tests in `tests/check/base.test.ts` and `tests/adopt/brackets.test.ts`. [REQ-CHK-006, REQ-CHK-004] Verify: `bun run build && bun test tests/check tests/adopt && bash tests/parity/run.sh`

## 4. The skill

- [x] 4.1 Change the `plan`, `repair`, and `archive` bullets of `skills/specctx-run/SKILL.md` and copy the file to `.claude/skills/` and `.agents/skills/`, per 031/D9. Add the tests for SCN-SKL-004-1 and SCN-SKL-004-2 in `tests/skills/lint.test.ts`. [REQ-SKL-004, REQ-SKL-001] Verify: `bun run build && bun test tests/skills tests/init/drift.test.ts`

## Workflow follow-up

- Run the steps under `operations.archive.guidance` in `openspec/config.yaml`.
- Archive with the command that `specctx next` prints.
- Run `npx -y @fission-ai/openspec@latest validate --all --strict` again before push.
