# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. Init keeps files

- [x] 1.1 `runInit` keeps `spec-ctx.toml` in every case and keeps each file with other content unless `--force` is set, per 014/D1 and D2. Return the kept files. The command prints a `kept <file> (other content)` line for each and a `next:` line with `--force` when one exists. Update the two tests in `tests/init/init.test.ts` that expect exit 2. Add tests for SCN-DIST-002-4 and SCN-SCH-003-4. [REQ-DIST-002, REQ-SCH-003] Verify: `bun run build && bun test tests/init`
- [x] 1.2 Update the help of `init` for `--force` in Strict mode. Add the change to the unreleased section of `CHANGELOG.md`. [REQ-DIST-002] Verify: `bun run build && node dist/cli.js init --help | node dist/cli.js lint ste --baseline 0 && grep -q "Unreleased" CHANGELOG.md`

## 2. Record

- [x] 2.1 Write `docs/verification/014.md`. Full gate. [REQ-GOV-001] Verify: `bun run ci:local`

## Workflow follow-up

- Archive with `npx -y @fission-ai/openspec@latest archive 014-init-keeps -y`, then `build`, `handoff write`, `stats --write`.
