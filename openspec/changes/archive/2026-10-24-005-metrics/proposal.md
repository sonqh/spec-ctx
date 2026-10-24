# Proposal

## Why

spec-ctx claims to save context, stop stale checkboxes, and cut CI minutes. Today none of those claims has a number behind it. The raw data is in the repo already: evidence files with timestamps and kinds, reopen files, bundle sizes, baseline entries. No command adds them up, and the pre-push gate leaves no trace at all. Before a second user adopts the tool, the tool must be able to say what it did.

## What Changes

- `specctx stats`: five metrics per change and for the whole project, as a table or JSON.
- A gate log: every `ci-local.sh` run appends one line to `.ctx/gate-log.jsonl`. `stats` reads it.
- `task start` records the bundle size next to the current task, so `stats` can compute the context ratio.
- `stats --write` saves `docs/metrics/<date>.md` so the numbers form a series in git.
- `specctx-done` skill ends with `stats` for the current change.

Out of scope: token counts (the repo cannot see them), A/B comparison against projects without spec-ctx, any dashboard.

## Capabilities

### New Capabilities
- `metrics`: the five metrics, their sources, and the gate log.

### Modified Capabilities
- `cli`: the `stats` command.

## Impact

- `src/stats/`, `.ctx/gate-log.jsonl` (committed), `docs/metrics/`.
- `.ctx/current.json` gains `bundle_chars`.
