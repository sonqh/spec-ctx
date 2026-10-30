# Proposal

## Why

Change 033 found five frictions in the loop. Each cost the agent a turn or a guess. They are in `docs/verification/033.md`, section "The loop on this change". This change closes them.

## What Changes

- `next` returns the plan stop. After planning is complete and before any task starts, it returns `ask` with `human: true` and the command `specctx handoff ask --change <c> "plan ready for <c>. Approve to start the tasks?"`. A question with `stage: plan` ends the stop, open or resolved. The skill runs the command that `next` prints.
- `bundle <REQ-ID> --block` prints one requirement block exactly as it sits in the spec file. The agent writes a MODIFIED delta from it and opens no spec file. The skill names the flag under the rule that forbids `openspec show`. It says that a MODIFIED block keeps every scenario title.
- `init --skills --force` already refreshes the skill copies. The drift test message names the full command with `bun run build` first. The skill gets one line about it.
- `next` keeps `work` or `fix` for the current task. The `reason` now names stale tasks, as `stale waiting: 033/2.1`.
- The skill warns that `gate` counts the Refs line in the 500 characters. It warns that the CHANGELOG entry goes under `## Unreleased`.

Out of scope:

- The GitHub Action.
- Changes to `adopt`.
- `stale_catches`. A later change takes it.
- A version bump.
- Any edit outside this repository.
- A config switch for the plan stop. `src/config.ts` has none, and `[loop] archive` names the archive stop only.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `loop`: REQ-LOOP-009 and REQ-LOOP-010 added.
- `query`: REQ-QRY-004 added.
- `skills`: REQ-SKL-003 modified, REQ-SKL-006 added.

## Impact

- `src/loop/next.ts`, `src/cli/args.ts`, `src/cli/commands.ts`, `src/cli/help.ts`, `src/graph/bundle.ts`.
- `skills/specctx-run/SKILL.md`, its copies in `.claude/skills` and `.agents/skills`, and `src/assets.generated.ts`.
- `tests/init/drift.test.ts`. Tests of `next` that expect `start` after planning get a plan question first.
- `CHANGELOG.md`, `README.md`, `docs/verification/034.md`.
