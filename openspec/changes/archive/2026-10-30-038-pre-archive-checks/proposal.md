# Proposal

## Why

Changes 034 to 037 each hit the same three small snags. They are in `docs/verification/034.md` to `037.md`.

- A scenario looks tested before the archive. After the archive, `check --strict` reports it as untested.
- `init --skills --force` also edits `.gitignore`.
- `id new SCN CLI-009` fails with an error that does not say what to do.

## What Changes

- `check --strict` reports `scenario-untested` for a delta scenario when its change has no open task.
- `init --skills --force` writes only the skill folders when `spec-ctx.toml` exists.
- The `id new` error for a code like `CLI-009` names the right command.

Out of scope:

- Stats, `next`, the action, and the replay script.
- A version bump.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `check`: REQ-CHK-008 added.
- `distribution`: REQ-DIST-013 added.
- `id-allocation`: REQ-IDS-005 added.

## Impact

- `src/check/check.ts`, `src/check/hints.ts`, `src/init/init.ts`, and `src/ids/ids.ts`.
- New tests under `tests/check`, `tests/init`, and `tests/ids`.
