# Proposal

## Why

REQ-CLI-007 asks `status` to end with a `next:` line. Today `status` prints no `next:` line when no change is open and every REQ has a test. Its table also differs from `specctx next`. With an open task and no current task, `status` says `specctx task next` and `next` says `specctx task start <t>`. An agent that reads both commands gets two answers.

The `specctx-run` skill runs the steps under `operations.archive.guidance` before an archive. This repository runs six more steps before an archive. They live only in a dogfood brief and in old task lines. So the skill does not run them.

## What Changes

- `status` always ends with one line `next: <command>`. The command is the `command` field of the decision that `specctx next` computes. A decision with no command prints `next: none`, like the human form of `next`.
- `status` with an active change now runs the OpenSpec status command once, as `next` does.
- `openspec/config.yaml` of this repository gets six new lines under `operations.archive.guidance`:
  - `node dist/cli.js stats --write`.
  - The README `## Measured` total row from the newest file under `docs/metrics/`.
  - The README `Archived:` line.
  - The change in `## Unreleased` of `CHANGELOG.md`.
  - `docs/verification/<NNN>.md`.
  - `bun run ci:local`.
- The existing guidance lines stay.
- The parity golden of `status` and the quote in `docs/getting-started.md` follow the new line.

Out of scope:

- The `--json` form of `status`. It keeps its keys.
- The `next:` lines of `task next`, `init`, and `adopt --dry-run`.
- The decision order of `specctx next`.
- The archive guidance in the `init` templates for other projects.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `cli`: REQ-CLI-007 modified.
- `spec-governance`: REQ-GOV-009 added.

## Impact

- `src/cli/status.ts`, `src/cli/commands.ts`.
- `tests/cli/`, `tests/helpers.ts`, `tests/gov/`, `tests/parity/run.sh`, `tests/fixtures/parity-golden/`.
- `openspec/config.yaml`, `docs/getting-started.md`.
- `README.md`, `CHANGELOG.md`, `docs/verification/030.md`.
