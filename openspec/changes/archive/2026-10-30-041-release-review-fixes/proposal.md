# Proposal

## Why

An independent review of the 0.4.0 diff found eight defects. One is a blocker. A passing `gate --rerun` line hides a failed `gate --strict`, so `next` returns `archive` when the gate failed. The other seven are smaller traps in the rerun, the plan stop, the action, and the replay script.

## What Changes

- `next` ignores gate log lines whose `steps` is exactly `["rerun"]` when it checks the gate.
- `gate --rerun` reports a missing Verify cwd as a `mismatch` and turns a spawn error into a `mismatch` for that task.
- The plan stop ends only on a question that `handoff ask --change <c> --plan` recorded. A plain question during planning gets `stage: design` and no longer ends the stop.
- `gate --rerun` prints one line and exits 0 when the merge base is HEAD.
- `action/run.sh` allows a rerun only on `pull_request` and `push`. The action text and the README tell push users to pass `base: ${{ github.event.before }}`.
- `tasksAt` reads paths with `-z`, so a non-ASCII change folder counts.
- The human form of `next` prints `tasks: none` for an empty list and joins IDs with a comma and a space.
- `scripts/replay-rerun.sh` reads a bare `YYYY-MM-DD` as midnight and prints `replay: 0 commits since <date>` when nothing matches.

Out of scope:

- A version bump.
- New commands. The one new flag is `--plan` on `handoff ask`.
- Stats.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `loop`: REQ-LOOP-007 and REQ-LOOP-009 modified. REQ-LOOP-011 and REQ-LOOP-012 added.
- `verify-runner`: REQ-VER-009 to REQ-VER-012 added.
- `distribution`: REQ-DIST-011 modified.

## Impact

- `src/loop/next.ts`, `src/cli/gate.ts`, `src/gate/rerun.ts`, `src/handoff/`, `src/cli/args.ts`, `src/cli/workflow.ts`, `src/cli/help.ts`.
- `action/run.sh`, `action.yml`, `scripts/replay-rerun.sh`, README, CHANGELOG, docs.
- Help goldens and tests.
- A question with `stage: plan` from a plain `handoff ask --change` in an older `questions.json` still ends the plan stop. That file is local state.
