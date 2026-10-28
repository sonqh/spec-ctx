# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root. The path tests need the network.

## 1. Path tests on upstream

- [x] 1.1 `tests/paths/fresh.sh` runs upstream `@latest`, per 023/D1. It creates a change with `openspec new change`, writes the artifacts from the templates, closes both tasks, and ends with `gate --strict` exit 0 with no config edit, per 023/D2. `tests/paths/existing.sh` runs `@latest` too. [REQ-ADOPT-009] Verify: `bun run build && bash tests/paths/fresh.sh && bash tests/paths/existing.sh`
- [x] 1.2 `tests/paths/rules-only.sh` shows that the `rules` of `openspec/config.yaml` reach the instruction of the stock `spec-driven` schema, per 023/D3. Add it to `scripts/ci-local.sh` and `ci.yml`, per 023/D4. [REQ-SCH-005, REQ-ADOPT-009] Verify: `bun run build && bash tests/paths/rules-only.sh && bun test tests/gov/ci-parity.test.ts`

## 2. Docs

- [x] 2.1 `docs/getting-started.md` shows the fresh path on upstream OpenSpec and the README links it, per 023/D5 and 023/D6. The README existing path drops `task backfill`. Both files pass the linters. [REQ-ADOPT-009] Verify: `bun run build && grep -q 'docs/getting-started.md' README.md && node dist/cli.js lint tells --baseline 0 docs/getting-started.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation docs/getting-started.md && bun test tests/gov/readme.test.ts`

## 3. Record

- [x] 3.1 Add the change to `CHANGELOG.md`. Write `docs/verification/023.md` with the result of `rules-only.sh`. Full gate. [REQ-GOV-001] Verify: `bun run ci:local`

## Workflow follow-up

- Archive with `npx -y @fission-ai/openspec@latest archive 023-upstream-paths -y`, then `build`, `handoff write`, `stats --write`.
