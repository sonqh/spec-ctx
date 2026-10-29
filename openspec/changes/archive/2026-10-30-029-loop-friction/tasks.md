# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. The loop engine

- [x] 1.1 Add the flag `--change` to `handoff ask` in `src/cli/args.ts`, `src/cli/help.ts`, and `src/cli/workflow.ts`, and pass the change to `ask` in `src/handoff/handoff.ts`, per 029/D1. Exit 2 on a change with no active folder. Record the help golden with `SPECCTX_HELP_RECORD=1`, per 029/D7. Add one line on `--change` to `docs/getting-started.md`. Add the tests for SCN-LOOP-005-1 and SCN-LOOP-005-2 in `tests/loop/next.test.ts`. [REQ-LOOP-005, REQ-HND-002, REQ-CLI-001] Verify: `bun run build && bun test tests/loop tests/handoff tests/cli`
- [x] 1.2 Add `failLine` to `src/loop/fails.ts` and use it for the reason in `src/loop/next.ts`, per 029/D3. Keep `capQuestion` as it is, per 029/D4. Add the tests for SCN-LOOP-006-1 to SCN-LOOP-006-3 in `tests/loop/next.test.ts`. Change the test of SCN-LOOP-001-3 only where it fails. [REQ-LOOP-006, REQ-LOOP-001] Verify: `bun run build && bun test tests/loop`

## 2. Metrics

- [x] 2.1 Add `task-without-verify` and `weak-verify` to `DEBT_RULES` and to the change row count in `src/stats/stats.ts`, per 029/D5. Add the test for SCN-STAT-004-3 in `tests/stats/metrics.test.ts`. [REQ-STAT-004] Verify: `bun run build && bun test tests/stats`

## 3. The skill

- [x] 3.1 Rewrite the `plan` and `archive` bullets and the top line of `skills/specctx-run/SKILL.md`, per 029/D6. Copy the file to `.claude/skills/specctx-run/` and `.agents/skills/specctx-run/`. Change the test of SCN-SKL-001-3 and add the tests for SCN-SKL-003-1 and SCN-SKL-003-2 in `tests/skills/lint.test.ts`. [REQ-SKL-001, REQ-SKL-003] Verify: `bun run build && bun test tests/skills tests/init && node dist/cli.js lint tells --baseline 0 skills/specctx-run/SKILL.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation skills/specctx-run/SKILL.md`

## 4. Record

- [x] 4.1 Add the row `| LOOP | loop |` to the capability table of `decisions/ADR-002-id-scheme.md`, per 029/D8. [REQ-GOV-001] Verify: `grep -Fqx '| LOOP | loop |' decisions/ADR-002-id-scheme.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation decisions/ADR-002-id-scheme.md`
- [x] 4.2 Run `node dist/cli.js stats --write`. Update the README `## Measured` total row and the `Archived:` line. Add the change to `## Unreleased` in `CHANGELOG.md`. Write `docs/verification/029.md` with the note on the help golden. Full gate. [REQ-GOV-001, REQ-GOV-004] Verify: `bun run ci:local`

## Workflow follow-up

- Run the steps under `operations.archive.guidance` in `openspec/config.yaml`.
- Archive with `npx -y @fission-ai/openspec@latest archive 029-loop-friction -y`, then `build`, `handoff write`, `stats --write`.
- Run `npx -y @fission-ai/openspec@latest validate --all --strict` again before push.
