# Proposal

## Why

ADR-006 items 3 and 8. A user must know three skills and nothing chains the steps. Change 024 ships `specctx next`, a read command that prints the next action as one of ten values. One skill can loop on it. And `schemas/spec-driven-ids/schema.yaml` is 301 lines, 278 of them a copy of upstream text that drifts on every OpenSpec release. `tests/paths/rules-only.sh` passed on upstream 1.15.0 on 2026-10-28, so the `rules` and `operations` that `init --schema` merges into `openspec/config.yaml` reach the agent on the stock `spec-driven` schema. REQ-SCH-005 records that proof. The schema copy can go.

## What Changes

- One skill, `specctx-run`. It runs `specctx next --json`, acts on `action`, runs `specctx handoff write`, and repeats until `stop` or `human`. It calls the upstream `openspec-propose` and `openspec-archive-change` skills by name and never calls `/opsx:apply`.
- `specctx-bootstrap`, `specctx-next`, and `specctx-done` become six line aliases that point at `specctx-run`. Their folders stay for one release. `init --skills` installs all four folders.
- `schemas/spec-driven-ids/schema.yaml` goes. The bundle keeps the four templates with ID placeholders, the config fragment, and the README. `init --schema` installs the templates into `openspec/templates/spec-driven-ids/` and merges the fragment. It no longer writes `schema: spec-driven-ids`. A project that still has that value gets a note and keeps its file.
- The `apply` guidance in the fragment says that a task closes only with `specctx task done <id>` and that the agent runs the `specctx-run` skill, never `/opsx:apply`. The text `mark complete as you go` goes with the schema copy.
- `openspec/config.yaml` of this repository says `schema: spec-driven` and gets the same `apply` guidance line. Upstream `openspec status` and `openspec instructions` failed on this repository before, with `Schema 'spec-driven-ids' not found`.
- `CLAUDE.md`, `README.md`, and `docs/getting-started.md` name `specctx-run` and the templates path.

Out of scope: the `next` command itself (change 024), the repo-local `bootstrap-context` skill, the removal of the three alias folders.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `skills`: REQ-SKL-001, REQ-SKL-002.
- `schema-bundle`: REQ-SCH-001 removed, REQ-SCH-002, REQ-SCH-003.

## Impact

- `skills/`, `schemas/spec-driven-ids/`, `src/init/init.ts`, `src/cli/help.ts`, `.claude/skills/`, `.agents/skills/`, `openspec/config.yaml`.
- `tests/skills/lint.test.ts`, `tests/init/`, `tests/schema/`, `tests/paths/fresh.sh`, `tests/paths/rules-only.sh`, `tests/cli/nextstep.test.ts`, `tests/fixtures/schema-project/`, `tests/fixtures/help-golden/`.
- `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `docs/getting-started.md`.
