# Proposal

## Why

Change 038 left two gaps. They are in `docs/verification/038.md`.

- `bun test` prints a failed test as a line that starts with `(fail)`. `failLine` does not match it. The question at the attempt cap quoted the summary line `Ran 28 tests across 4 files`.
- A delta requirement with no `// Covers:` tag passes until the archive. Then it shows as `uncovered`. This happened to REQ-IDS-005.

## What Changes

- `failLine` also matches a line that starts with `(fail)` after trimming.
- `check --strict` reports `uncovered` for a delta requirement when its change has no open task.

Out of scope:

- Stats, `next`, the action, and a new command.
- A version bump.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `loop`: REQ-LOOP-006 modified.
- `check`: REQ-CHK-009 added.

## Impact

- `src/loop/fails.ts` and `src/check/check.ts`.
- Tests in `tests/loop/fail-reason.test.ts` and `tests/check/delta-req.test.ts`.
