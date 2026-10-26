# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. Strings

- [x] 1.1 Quote every list item in `schemas/spec-driven-ids/config-fragment.yaml` and in `openspec/config.yaml`. Fix `schema: spec-driven` to `spec-driven-ids` and `ctx check` to `node dist/cli.js check` in the project config. Add `tests/schema/strings.test.ts` for SCN-SCH-003-2. Regenerate `src/assets.generated.ts`. [REQ-SCH-003] Verify: `bun run build && bun test tests/schema && npx -y @fission-ai/openspec@latest validate --all --strict 2>&1 | grep -c "must be an array of strings" | grep -qx 0`
- [x] 1.2 `init --schema` repairs one key mapping items under `rules.*` and `operations.*.guidance` into strings. Add a test for SCN-SCH-003-3 with a broken config in a temp dir. [REQ-SCH-003] Verify: `bun test tests/init`

## 2. README and catalog

- [ ] 2.1 Rewrite `schemas/spec-driven-ids/README.md` per 013/D3. Add a test for SCN-SCH-004-1 in `tests/schema/`. Add the catalog issue text to `docs/upstream-issue.md` per 013/D4. Lint both. [REQ-SCH-004] Verify: `bun test tests/schema && node dist/cli.js lint tells --baseline 0 schemas/spec-driven-ids/README.md docs/upstream-issue.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation schemas/spec-driven-ids/README.md docs/upstream-issue.md`
- [ ] 2.2 Write `docs/verification/013.md`. Full gate. [REQ-GOV-001] Verify: `bun run ci:local`

## Workflow follow-up

- Archive with `npx -y @fission-ai/openspec@latest archive 013-schema-catalog -y`, then `build`.
