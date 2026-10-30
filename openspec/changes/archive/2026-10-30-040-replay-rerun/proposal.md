# Proposal

## Why

ADR-006 phase 2 sets an exit criterion: two weeks of replay on spec-ctx and one external repository with zero flaky failures. Change 036 added `specctx gate --rerun`. Nothing measures it over time yet. A person cannot tell a flaky Verify from a real mismatch by one run.

## What Changes

- A dev script, `scripts/replay-rerun.sh`, replays `gate --rerun` over the first-parent history of a repository.
- It runs the rerun N times for each commit, in a throwaway worktree, with the engine of this repository.
- It writes one JSON line per commit and a `summary.md` with counts.
- It exits 1 when a task is flaky. A mismatch alone is data.
- A short guide in `docs/verification/replay-rerun.md` gives the exact commands for spec-ctx and for an external repository.

Out of scope:

- CI wiring of the replay.
- Changes to `gate --rerun` and to anything under `src/`.
- Statistics beyond the counts.
- A version bump.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `verify-runner`: REQ-VER-008 added.

## Impact

- `scripts/replay-rerun.sh`, `docs/verification/replay-rerun.md`.
- Tests in `tests/replay/replay.test.ts`.
