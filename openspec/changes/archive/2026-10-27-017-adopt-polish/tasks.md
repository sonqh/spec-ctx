# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. Backfill

- [x] 1.1 `task backfill` skips archived changes, per 017/D1. Add a test for SCN-TASK-006-3 in `tests/tasks/backfill.test.ts` with an archived change in a temp project, and move the SCN-TASK-006-1 fixture to active changes. Update the help summary in Strict mode. [REQ-TASK-006] Verify: `bun run build && bun test tests/tasks/backfill.test.ts`

## 2. Init

- [x] 2.1 `init` adds the two `.gitignore` lines under `# spec-ctx`, creates the file when missing, prints `wrote .gitignore (2 lines)` or `kept .gitignore`, and prints the `.claude/` note, per 017/D2 and 017/D3. Add tests for SCN-DIST-002-6 and SCN-DIST-002-7 in `tests/init/init.test.ts`. [REQ-DIST-002] Verify: `bun run build && bun test tests/init/init.test.ts`
- [x] 2.2 `init` writes `tests = ["test/**"]` and `code = ["lib/**"]` when only those dirs exist, per 017/D4. Add a test for SCN-DIST-002-8 in `tests/init/init.test.ts`. [REQ-DIST-002] Verify: `bun run build && bun test tests/init/init.test.ts tests/config.test.ts`

## 3. Adopt and query

- [x] 3.1 `adopt --dry-run` ends with `exit 1: <n> headers need an ID. Next: specctx adopt`, per 017/D5. Add a test for SCN-ADOPT-001-3 in `tests/adopt/dryrun.test.ts` and check the line in `tests/paths/existing.sh`. [REQ-ADOPT-001] Verify: `bun run build && bun test tests/adopt/dryrun.test.ts && bash tests/paths/existing.sh`
- [x] 3.2 `query --change <name>` with no term lists every canonical entry of the change, per 017/D6. The hint of `task start` names the call, per 017/D7. Add a test for SCN-QRY-001-5 in `tests/query/query.test.ts` and update SCN-TASK-002-4 in `tests/tasks/start.test.ts`. Update the help of `query` in Strict mode. [REQ-QRY-001, REQ-TASK-002] Verify: `bun run build && bun test tests/query/query.test.ts tests/tasks/start.test.ts tests/cli`

## 4. Record

- [x] 4.1 Add the change to the unreleased section of `CHANGELOG.md`. Add a rerun section to `docs/dogfood/openspec.md`. Write `docs/verification/017.md`. Full gate. [REQ-GOV-001] Verify: `bun run ci:local`

## Workflow follow-up

- Archive with `npx -y @fission-ai/openspec@latest archive 017-adopt-polish -y`, then `build`, `handoff write`, `stats --write`.
