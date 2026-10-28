# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. Gate defaults

- [x] 1.1 The code default of `[gate] markdown` is `[]` and `init` writes `markdown = []` with a comment that says how to turn the lint on, per 022/D1. Update `tests/config.test.ts`. [REQ-DIST-002] Verify: `bun run build && bun test tests/config.test.ts`
- [x] 1.2 `init` pins the OpenSpec version in `[gate] openspec`, with `SPECCTX_OPENSPEC` as the short circuit and a note on failure, per 022/D2 and 022/D3. Tests in `tests/init/init.test.ts` with a fake `npx` on `PATH`. [REQ-DIST-002] Verify: `bun run build && bun test tests/init tests/config.test.ts tests/cli/nextstep.test.ts`

## 2. Init merge and gitignore

- [x] 2.1 `init --schema` merges `rules` and `operations` item by item into an existing key and prints `merged openspec/config.yaml rules (<n> added)`, per 022/D4. Test with a config that has two `rules.specs` items. [REQ-SCH-003] Verify: `bun run build && bun test tests/init`
- [x] 2.2 `init` writes four `.gitignore` lines, per 022/D5. Add `.ctx/current.json` to this repository's `.gitignore`. [REQ-DIST-002] Verify: `bun run build && bun test tests/init && grep -q '^.ctx/current.json$' .gitignore && grep -q '^.ctx/gate-log.jsonl$' .gitignore`

## 3. Questions file

- [x] 3.1 `.ctx/questions.json` owns the open and resolved questions. `handoff ask` appends, `handoff resolve` updates, `handoff write` and `status` read it, per 022/D6, 022/D7, and 022/D9. [REQ-HND-001, REQ-HND-002, REQ-HND-003] Verify: `bun run build && bun test tests/handoff tests/cli/status-archived.test.ts`
- [x] 3.2 `handoff write` migrates the questions of an old `handoff.md` into `questions.json` once and prints `migrated <n> question(s) to .ctx/questions.json`, per 022/D8. Run it on this repository. [REQ-HND-001, REQ-HND-002] Verify: `bun run build && bun test tests/handoff && test -f .ctx/questions.json`

## 4. Record

- [x] 4.1 README: the fresh path, the existing path, and the config reference name `markdown = []`, the pinned `openspec`, the four `.gitignore` lines, and `questions.json`. Add the change to `CHANGELOG.md`. Write `docs/verification/022.md`. Full gate. [REQ-GOV-001] Verify: `bun run ci:local`

## Workflow follow-up

- Archive with `npx -y @fission-ai/openspec@latest archive 022-adopter-defaults -y`, then `build`, `handoff write`, `stats --write`.
