# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. Gate on day one

- [x] 1.1 `check` skips `missing-id` on archived entries, per 015/D1. Add a test for SCN-CHK-001-6 in `tests/check/base.test.ts` that writes an archived change with headers without an ID into a temp project. [REQ-CHK-001] Verify: `bun run build && bun test tests/check/base.test.ts`
- [x] 1.2 `baseline write` records `missing-id <file> <title>`, per 015/D2. `check` hides it. `prune` drops it. Add tests for SCN-ADOPT-005-4 and SCN-ADOPT-005-5 in `tests/baseline/baseline.test.ts`. Extend `tests/paths/existing.sh` with an archived change and an unmatched delta in the temp copy. The path then ends with `gate --strict` exit 0 on a tree like the OpenSpec fork. [REQ-ADOPT-005] Verify: `bun run build && bun test tests/baseline && bash tests/paths/existing.sh`

## 2. Hints and flags

- [x] 2.1 `task start` prints the hint line of 015/D4 when the task cites no REQ, in text and `--json`. Add a test for SCN-TASK-002-4 in `tests/tasks/`. [REQ-TASK-002] Verify: `bun run build && bun test tests/tasks`
- [x] 2.2 `query --kind` lowers the kind before the match, per 015/D5. Add a test for SCN-QRY-001-4 in `tests/query/`. Update the help text of `query --kind` in Strict mode. [REQ-QRY-001] Verify: `bun run build && bun test tests/query && node dist/cli.js query --help | node dist/cli.js lint ste --baseline 0`

## 3. Record

- [x] 3.1 Add the change to the unreleased section of `CHANGELOG.md`. Write `docs/verification/015.md`. Full gate. [REQ-GOV-001] Verify: `bun run ci:local`

## Workflow follow-up

- Archive with `npx -y @fission-ai/openspec@latest archive 015-adopt-day-one -y`, then `build`, `handoff write`, `stats --write`.
