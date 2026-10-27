# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. Config

- [x] 1.1 Add `gate.markdown` (list of strings) to `Config`, its defaults, the loader, and the `init` template with a comment, per 016/D5. `gate` reads it when `--markdown` is absent. Add tests for SCN-DIST-002-5 and SCN-CLI-004-5 in `tests/config.test.ts` and `tests/cli/gate.test.ts`. [REQ-DIST-002, REQ-CLI-004] Verify: `bun run build && bun test tests/config.test.ts tests/cli/gate.test.ts`

## 2. Ratchet

- [x] 2.1 `src/lint/counts.ts`: lint the gate globs and return a map of `lint <file> <rule>` to the hard finding count, per 016/D1. `baseline write` records the lines, `baseline prune` drops and lowers them, per 016/D4. Add tests for SCN-ADOPT-007-1 and SCN-ADOPT-007-3 in `tests/baseline/baseline.test.ts`. [REQ-ADOPT-007] Verify: `bun run build && bun test tests/baseline`
- [x] 2.2 `gate` compares the current counts with the baseline, prints the summary line, the capped detail, and the `--json` list, per 016/D3. Add tests for SCN-CLI-004-4 and SCN-ADOPT-007-2 in `tests/cli/gate.test.ts`. Extend `tests/paths/existing.sh` with a dirty `docs/notes.md`, per 016/D7. [REQ-CLI-004, REQ-ADOPT-007] Verify: `bun run build && bun test tests/cli/gate.test.ts && bash tests/paths/existing.sh`

## 3. Record

- [x] 3.1 Update the help of `gate --markdown` in Strict mode and the README existing path section. Add the change to the unreleased section of `CHANGELOG.md`. Write `docs/verification/016.md`. Full gate. [REQ-GOV-001] Verify: `bun run ci:local`

## Workflow follow-up

- Archive with `npx -y @fission-ai/openspec@latest archive 016-lint-ratchet -y`, then `build`, `handoff write`, `stats --write`.
