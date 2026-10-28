# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. The run skill

- [x] 1.1 Write `skills/specctx-run/SKILL.md` with the loop and the action table, per 025/D1. Turn the three old skills into six line aliases, per 025/D2. Update `tests/skills/lint.test.ts` for SCN-SKL-001-3, SCN-SKL-001-4, and SCN-SKL-001-5, and `tests/init/drift.test.ts` and `tests/init/init.test.ts` for the four folders. Refresh `.claude/skills/` and `.agents/skills/` with `init --skills --force`. [REQ-SKL-001, REQ-SKL-002] Verify: `bun run build && bun test tests/skills tests/init/drift.test.ts`

## 2. The schema copy

- [x] 2.1 Remove `schemas/spec-driven-ids/schema.yaml`. `init --schema` installs the templates into `openspec/templates/spec-driven-ids/` and merges the fragment. It no longer writes the `schema` line and prints the note on a legacy value. Per 025/D3, 025/D4, 025/D5, and 025/D6. New `rules.specs` item names the templates path. Update the `--schema` help line, `TEMPLATES_NOTE`, and the bundle README. Update `tests/init/init.test.ts`, `tests/cli/nextstep.test.ts`, `tests/schema/strings.test.ts`, and `tests/schema/readme.test.ts` for SCN-SCH-003-7 and SCN-SCH-003-8. [REQ-SCH-003] Verify: `bun run build && bun test tests/init tests/cli tests/schema`
- [x] 2.2 Move `tests/schema/validate.sh`, `tests/schema/roundtrip.sh`, the fixture `tests/fixtures/schema-project/`, `tests/paths/fresh.sh`, and `tests/paths/rules-only.sh` to the stock schema and the templates path, per 025/D7. `openspec/config.yaml` of this repository says `schema: spec-driven`, per 025/D8. [REQ-SCH-002, REQ-SCH-003, REQ-SCH-005] Verify: `bun run build && bash tests/schema/validate.sh && bash tests/schema/roundtrip.sh && bash tests/paths/fresh.sh && bash tests/paths/rules-only.sh`

## 3. Record

- [x] 3.1 `CLAUDE.md` names `specctx-run`. `README.md` and `docs/getting-started.md` name the one skill, the aliases, and the templates path. Add the change to the unreleased section of `CHANGELOG.md`. Write `docs/verification/025.md`. Re-record the help golden. Full gate. [REQ-GOV-001] Verify: `bun run ci:local`

## Workflow follow-up

- Archive with `npx -y @fission-ai/openspec@latest archive 025-run-skill -y`, then `build`, `handoff write`, `stats --write`.
