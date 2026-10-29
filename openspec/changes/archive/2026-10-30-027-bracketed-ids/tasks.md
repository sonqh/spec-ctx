# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. Read and write the bracketed form

- [x] 1.1 Read both forms in `REQ_HDR` and `SCN_HDR` of `src/index/scan.ts`, per 027/D1. Add the tests for SCN-IDX-006-1 to SCN-IDX-006-4 in `tests/index/scan.test.ts`. [REQ-IDX-006] Verify: `bun run build && bun test tests/index && bash tests/parity/run.sh`
- [x] 1.2 Add `[ids] brackets` to `src/config.ts`, per 027/D2. Read and write both forms in `src/adopt/plan.ts`, per 027/D3. Read bracketed TO lines and update the hint in `src/check/check.ts` and `src/check/hints.ts`, per 027/D4. Add the tests for SCN-ADOPT-010-1 to SCN-ADOPT-010-4 in `tests/adopt/brackets.test.ts`. Raise the key count in `tests/config.test.ts`. [REQ-ADOPT-010] Verify: `bun run build && bun test tests/adopt tests/check tests/config.test.ts`
- [x] 1.3 Print the bracketed form from `id new` and accept it in `--for`, per 027/D5. Add the tests for SCN-IDS-004-1 to SCN-IDS-004-4 in `tests/ids/new.test.ts`. [REQ-IDS-004] Verify: `bun run build && bun test tests/ids`

## 2. Record

- [x] 2.1 Add the line to ADR-002 under Consequences. Add the key to the README config block. Add the change to the unreleased section of `CHANGELOG.md`. Write `docs/verification/027.md`. Full gate. [REQ-GOV-001, REQ-IDX-006] Verify: `bun run ci:local`

## Workflow follow-up

- Archive with `npx -y @fission-ai/openspec@latest archive 027-bracketed-ids -y`, then `build`, `handoff write`, `stats --write`.
