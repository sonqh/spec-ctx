# Proposal

## Why

A stranger ran spec-ctx 0.4.0 on a real OpenSpec project with 13 archived changes. `check` gave 192 findings on day one. 142 of them came from tasks inside `openspec/changes/archive/`. The first `next` action pointed at a ticked task with no Verify command. It returned `repair`, and the `repair` command cannot succeed. A task that passed Verify could also keep an attempt-cap question open, so `next` kept asking.

## What Changes

- The scan emits `task-without-req` and `task-without-verify` only for tasks outside the archive. `check` and `index.json` problems then agree. This matches every other task rule.
- `next` returns `repair` for a ticked task without evidence only when the task has a Verify command. `next` skips a baselined task without Verify. An unbaselined one gets `cite`, as before.
- After a real `adopt` that wrote IDs, the output ends with a note to commit the baseline with a `baseline:` subject, and a `next:` line with `baseline write`. `adopt` still writes no baseline.
- A passing `task done` resolves the open attempt-cap question of its task. Plan, design, and archive questions stay open.

Out of scope:

- Capability codes in `adopt`.
- A version bump.
- Stats.
- Changes to `baseline write` and `baseline prune`.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `check`: REQ-CHK-001 modified.
- `adopt-existing`: REQ-ADOPT-002 modified.
- `loop`: REQ-LOOP-013 and REQ-LOOP-014 added.

## Impact

- `src/index/scan.ts`, `src/loop/next.ts`, `src/loop/fails.ts`, `src/cli/workflow.ts`, `src/adopt/write.ts`.
- `CHANGELOG.md`, `docs/verification/044.md`.
- Output of `next` and `adopt` changes only in the cases above.
