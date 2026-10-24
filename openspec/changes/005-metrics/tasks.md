# Tasks

## 1. Inputs

- [x] 1.1 Record `bundle_chars` and `started_at` in `task start`, copy both into evidence in `task done`. [REQ-STAT-002] Verify: `bun test tests/tasks/start.test.ts tests/tasks/done.test.ts`
- [x] 1.2 Append the gate log line in `scripts/ci-local.sh`, including on failure. [REQ-STAT-005] Verify: `bun test tests/gov/gate-log.test.ts`

## 2. Stats

- [x] 2.1 Implement the five metrics with input counts and `n/a`. [REQ-STAT-001, REQ-STAT-003, REQ-STAT-004] Verify: `bun test tests/stats/metrics.test.ts`
- [x] 2.2 Implement the gate metrics, `--json`, `--write`, and the `Read` help entry. [REQ-STAT-005, REQ-CLI-001] Verify: `bun test tests/stats/cli.test.ts && node dist/cli.js --help | python3 scripts/ste-lint.py --baseline 0`

## 3. Dogfood

- [ ] 3.1 Backfill `bundle_chars` for this change's own tasks where `current.json` has it. Run `stats --write` and commit the first `docs/metrics/` file. Add `stats` to the `specctx-done` skill. Write `docs/verification/005.md`. [REQ-STAT-001, REQ-GOV-001] Verify: `node dist/cli.js stats && test -n "$(ls docs/metrics/)" && bash scripts/ci-local.sh`

## Workflow follow-up

- Archive with `/opsx:archive 005-metrics`, then `specctx build`.
