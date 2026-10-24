# Tasks

## 1. Fixtures

- [x] 1.1 Build `tests/fixtures/no-id-repo/`. It is an OpenSpec project with two capabilities and no IDs. It has one active change with a MODIFIED block, an ADDED block, a RENAMED in flight, and two ticked tasks without evidence. [REQ-ADOPT-001, REQ-ADOPT-002] Verify: `npx -y @fission-ai/openspec@latest validate --all --strict --no-interactive` run inside the fixture exits 0

## 2. Adopt

- [x] 2.1 Implement the scan and `adopt --dry-run` with the mapping output. [REQ-ADOPT-001] Verify: `bun test tests/adopt/dryrun.test.ts`
- [x] 2.2 Implement CAP derivation with collision suffix and the config write. [REQ-ADOPT-004] Verify: `bun test tests/adopt/caps.test.ts`
- [x] 2.3 Implement the atomic write with RENAMED aware matching, post-write check, rollback, unmatched report, and `adopt-report.md`. [REQ-ADOPT-002, REQ-ADOPT-003] Verify: `bun test tests/adopt/write.test.ts tests/adopt/idempotent.test.ts`

## 3. Baseline and backfill

- [x] 3.1 Implement `baseline write`, `baseline prune`, and the filter in `check --strict` with the `baselined:` line. [REQ-ADOPT-005, REQ-CHK-002] Verify: `bun test tests/baseline/*.test.ts`
- [x] 3.2 Implement `task backfill`. [REQ-TASK-006] Verify: `bun test tests/tasks/backfill.test.ts`
- [x] 3.3 Add the commands to the CLI under `Setup`. Lint help. [REQ-CLI-001] Verify: `bun test tests/cli/help.test.ts && node dist/cli.js --help | python3 scripts/ste-lint.py --baseline 0`

## 4. Paths and docs

- [x] 4.1 Write `tests/paths/fresh.sh` and `tests/paths/existing.sh`, add both to `ci-local.sh` and CI. [REQ-ADOPT-006] Verify: `bash tests/paths/fresh.sh && bash tests/paths/existing.sh`
- [x] 4.2 Run `adopt --dry-run` on a clone of a real public OpenSpec project (the OpenSpec repository itself under `openspec/`) and record the numbers in `docs/verification/004.md`. Do not commit the clone. [REQ-ADOPT-001] Verify: `test -s docs/verification/004.md`
- [ ] 4.3 README: the two paths. Write `docs/verification/004.md`. Full gate. [REQ-ADOPT-006, REQ-GOV-001] Verify: `bash scripts/ci-local.sh`

## Workflow follow-up

- Archive with `/opsx:archive 004-adopt-existing`, then `specctx build`.
