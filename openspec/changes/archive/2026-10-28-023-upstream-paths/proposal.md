# Proposal

## Why

ADR-006 item 7 drops the fork of OpenSpec. The exit condition of phase 0 reads: `tests/paths/fresh.sh` and `existing.sh` pass on upstream `@fission-ai/openspec` with no fork. The fresh path ends with `gate --strict` exit 0 with no config edit. Today both scripts pin `@1.14.3` and the fresh path writes no change at all, so they prove less than the ADR asks. Item 8 asks for one test before the schema copy goes: rules alone, through `openspec/config.yaml`, must reach the agent with the ID instruction. And a developer who knows OpenSpec has no guide in this repository. The guide that exists lives in the fork and names a tarball.

## What Changes

- `tests/paths/fresh.sh` runs upstream `@fission-ai/openspec@latest`. It creates its change with `openspec new change`, writes the artifacts from the templates under `openspec/schemas/spec-driven-ids/templates/`, allocates the IDs with `specctx id new`, closes the tasks with `task done`, and ends with `gate --strict` exit 0. It edits no config after `init --all`.
- `tests/paths/existing.sh` runs upstream `@latest` too and keeps its end: `gate --strict` exit 0.
- A new test `tests/paths/rules-only.sh` runs `openspec init`, `specctx init --schema`, sets `schema: spec-driven` back, and asserts that `openspec instructions specs --change <c>` carries `specctx id new` in its rules. The schema copy stays in this change. `scripts/ci-local.sh` and `.github/workflows/ci.yml` run the new test next to the other two.
- `docs/getting-started.md` shows the fresh path on upstream OpenSpec for a developer who knows OpenSpec. The README links it. The README existing path drops `task backfill`.
- REQ-ADOPT-009 and REQ-SCH-005 are new. REQ-ADOPT-006 stays as it is. Its `task backfill` words leave with the command.

Out of scope: the removal of the schema copy (phase 1), the `retitle-needs-renamed` rule, and the `/specctx-run` skill.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `adopt-existing`: REQ-ADOPT-009 is new.
- `schema-bundle`: REQ-SCH-005 is new.

## Impact

- `tests/paths/fresh.sh`, `tests/paths/existing.sh`, `tests/paths/rules-only.sh`, `scripts/ci-local.sh`, `.github/workflows/ci.yml`.
- `docs/getting-started.md`, `README.md`, `CHANGELOG.md`, `docs/verification/023.md`.
