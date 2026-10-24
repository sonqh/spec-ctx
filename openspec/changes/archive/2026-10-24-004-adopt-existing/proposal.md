# Proposal

## Why

spec-ctx was built on two repositories that had IDs from their first commit. A project that already uses OpenSpec has none. Its requirements are matched by header text, its tasks are ticked by hand, and dozens of them have no test tag. Today such a project cannot adopt spec-ctx without a weekend of manual edits, and `check --strict` would be red on day one. The agentrc migration showed the gap in a small way: backfilling evidence for 106 tasks needed a shell loop because no command existed.

## What Changes

- `specctx adopt`: assigns IDs to every requirement and scenario that has none, in main specs and in active change deltas, in one atomic write. `--dry-run` prints the mapping and writes nothing.
- `specctx baseline write` and `baseline prune`: a ratchet for strict findings that existed before adoption. Strict reports only new findings.
- `specctx task backfill --manual "<note>"`: evidence for every ticked task that has none.
- README gains two install paths: fresh project and existing project, each tested end to end.

Out of scope: assigning IDs to archived changes, rewriting code comments, merging duplicate requirements, any change to OpenSpec's own matching.

## Capabilities

### New Capabilities
- `adopt-existing`: ID assignment and the baseline ratchet.

### Modified Capabilities
- `check`: the baseline filter.
- `task-workflow`: `task backfill`.
- `cli`: new commands and help groups.

## Impact

- `src/adopt/`, `src/baseline/`, `.ctx/baseline.json`, `adopt-report.md`.
- Two new fixtures. One OpenSpec project without IDs that has one active change with a MODIFIED block. One dry run on a clone of a real public OpenSpec project.
