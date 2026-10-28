# Design

## Context

Change 024 gives `specctx next --json` with the closed `action` enum `plan`, `cite`, `start`, `work`, `fix`, `repair`, `gate`, `archive`, `ask`, `stop`, plus `human`, `task`, `change`, `command`, and `reason`. This change writes the skill that dispatches on it and cuts the schema copy. See proposal.md for the motivation.

## Decisions

- D1 `skills/specctx-run/SKILL.md` is one table of actions. Each row names the exact commands. The loop is four lines: run `next`, act, run `handoff write`, repeat. The skill stops on `action: stop`, on `human: true`, and on any `action` outside the list. It keeps no state in the context window, so a new session runs the same loop again. Refs: REQ-SKL-001, ADR-006
- D2 The three old skills keep their folder and name. Each `SKILL.md` is six lines. The frontmatter keeps the old name and a one line description. The body is one line: `This skill is now specctx-run. Run it.` The description still carries the old triggers, so an agent that fires the old skill lands in the new one. Refs: REQ-SKL-001
- D3 `plan()` in `src/init/init.ts` installs every file under `skills/`, so the fourth folder needs no code change. The schema branch installs only `schemas/spec-driven-ids/templates/*` and maps it to `openspec/templates/spec-driven-ids/<file>`. `schema.yaml` and `README.md` of the bundle are no longer installed. The package still ships the folder. Refs: REQ-SCH-003
- D4 The templates path is `openspec/templates/spec-driven-ids/`. Upstream 1.15.0 reads a template only from `<schema dir>/templates/` of the resolved schema (`dist/core/artifact-graph/instruction-loader.js`, `loadTemplate`). A project override of the stock templates needs a full `schema.yaml` copy, which is the thing this change removes. So the templates are a reference the agent copies from. One new `rules.specs` item names the path, so the agent sees it in every `openspec instructions specs` output. The `templates:` line of `init` names it too. Refs: REQ-SCH-003, REQ-SCH-005
- D5 `mergeConfig` no longer touches the `schema` key. When the project text has `schema: spec-driven-ids`, `runInit` adds the note `note: schema spec-driven-ids is no longer installed. Set schema: spec-driven in openspec/config.yaml. The rules now carry the ID instructions.` to `notes` and leaves the line as it is. The user owns that line. Refs: REQ-SCH-003
- D6 The `apply` guidance item `Close each task with ...` gets new text. It says: close each task only with `specctx task done <id>`, never edit a checkbox, never run `/opsx:apply`, run the `specctx-run` skill. The item count of the fragment stays at five under `operations`, so the merge counts in the tests move only for the new `rules.specs` item. Refs: REQ-SCH-003, ADR-006
- D7 `tests/schema/validate.sh` no longer runs `openspec schema validate`. It checks the templates and the fragment on a fresh upstream project with the stock schema. `tests/schema/roundtrip.sh` archives the fixture change on the stock schema. The fixture `schema-project` says `schema: spec-driven` in both files. `tests/paths/fresh.sh` copies from `openspec/templates/spec-driven-ids/`. `tests/paths/rules-only.sh` drops its `sed` step. `init --schema` no longer changes the `schema` line. Refs: REQ-SCH-002, REQ-SCH-005
- D8 `openspec/config.yaml` of this repository moves to `schema: spec-driven`. Upstream `status` and `instructions` need a schema it can resolve, and `specctx next` calls `status --json`. The `apply` guidance of this repository gets the same `specctx task done` line in its own `node dist/cli.js` spelling. Refs: REQ-SCH-003

## Risks / Trade-offs

- An agent that fires an old skill reads six lines and one more file. That costs one hop for one release.
- The templates are not what `openspec instructions` prints on the stock schema. The agent gets the header format from the rules and the path from one rule. `rules-only.sh` proves the rules reach every artifact instruction.
- A project that keeps `schema: spec-driven-ids` after this release fails `openspec status` until the user edits one line. The note says which line.

## Open Questions

None.
