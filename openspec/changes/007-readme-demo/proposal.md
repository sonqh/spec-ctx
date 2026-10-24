# Proposal

## Why

The README explains spec-ctx in prose. A new reader still has to imagine what a session looks like. A 60 second recording of one task loop answers that faster than any paragraph, and it is the first thing a visitor sees on GitHub. The publish on 28 October makes the repo public, so the README should be ready before that.

## What Changes

- A recorded terminal session, committed as `docs/demo/loop.svg` (and `loop.cast` as the source), that shows: `specctx status`, `task next`, `task start`, one small edit, `task done`, `stats`.
- The README embeds the SVG under the first heading and keeps a plain text transcript under it for readers without images.
- The README "Status" section is rewritten for the current state: six archived changes, what works today, what waits for the publish.
- A `docs/demo/record.sh` that re-records the demo on a fixture project, so the recording can be refreshed after a CLI change.

Out of scope: a website, a video, screenshots of agents.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None. This change is documentation only (`skip_specs: true`).

## Impact

- `README.md`, `docs/demo/`. No code.
