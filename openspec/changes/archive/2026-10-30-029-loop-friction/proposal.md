# Proposal

## Why

Change 028 was the first change that ran through the `specctx-run` skill. The run found friction. The plan stop lives only in the skill text, so a new session gets `start` from `specctx next` and walks past a plan that no human approved. The `fix` reason shows the first line of the Verify tail, which tells a wrapper script nothing. The skill sends the archive to an upstream skill that reads specs directly. `stats` counts less debt than the baseline holds. ADR-002 has no LOOP row.

## What Changes

- `handoff ask --change <c> "<text>"` stores the active change folder as the `task` of the question. An unknown change exits 2. `next` already blocks a change on an open question with the change folder as `task`. So `next` returns `ask` with `human: true` until `handoff resolve` runs. No new state file.
- The `fix` reason of `next` shows the last line of the stderr tail that starts with `fail:` or `FAIL`, after leading spaces. With no such line, it shows the last non-empty line.
- `specctx-run` skill:
  - `plan` takes the change name from the request in kebab case and reads requirements with `specctx bundle` or `specctx query`, never `openspec show`. The plan stop runs `specctx handoff ask --change <c>`.
  - `archive` runs the steps under `operations.archive.guidance` in `openspec/config.yaml`, then the `command` field, then the post-archive checks. It no longer names `openspec-archive-change`.
  - It names `npx -y @fission-ai/openspec@latest` when `[gate] openspec` is absent.
- `stats` debt also counts `task-without-verify` and `weak-verify`.
- ADR-002 gets the row `LOOP | loop`.

Out of scope:

- The question text that `task done` writes at the attempt cap. It keeps the first line of the tail.
- `task-without-req` and `missing-id` in the debt count.
- An approval flag or a new file for the plan stop.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `loop`: REQ-LOOP-005 and REQ-LOOP-006 added. REQ-LOOP-001 modified.
- `skills`: REQ-SKL-003 added. REQ-SKL-001 modified.
- `metrics`: REQ-STAT-004 modified.

## Impact

- `src/cli/`, `src/handoff/handoff.ts`, `src/loop/`, `src/stats/stats.ts`.
- `skills/specctx-run/SKILL.md` and its two copies.
- `tests/loop/`, `tests/handoff/`, `tests/stats/`, `tests/skills/`, `tests/fixtures/help-golden/`.
- `decisions/ADR-002-id-scheme.md`, `README.md`, `CHANGELOG.md`, `docs/verification/029.md`.
