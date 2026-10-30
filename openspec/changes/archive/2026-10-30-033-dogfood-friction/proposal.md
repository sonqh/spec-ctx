# Proposal

## Why

The phase 1 dogfood of `specctx-run` left seven open frictions. They are in `docs/dogfood/specctx-run.md`, section "Friction still open". Each one cost the agent a turn or a guess. This change closes them.

## What Changes

- The skill tells the agent that it overrides two steps of the upstream `openspec-propose` skill. It reads specs with `specctx bundle` or `specctx query`. It never runs the closing `/opsx:apply`.
- The `gate` bullet of the skill gives a route for stale evidence. The agent goes back to step 1 and `next` returns `repair`.
- `next --json` gets a `tasks` key. It lists every stale task. `task` stays the first one. The `repair` command repairs all of them in one turn.
- The `dangling-ref` hint names the likely cause. A tag inside a string literal or fixture text reads as a link. The hint also names the fix. The scan does not skip string literals.
- The archive guidance in `openspec/config.yaml` names `node dist/cli.js build` for the index rebuild.
- A `spec-ctx.toml` that is not valid TOML gives one line on stderr and exit 2 in every command, `init` included. One shared function does it.
- `stats --write` keeps the UTC date in the file name. REQ-STAT-005 says so. A test proves it.
- The question at the attempt cap quotes the failing line of the tail. It uses `failLine`.

Out of scope:

- The GitHub Action.
- Changes to `adopt`.
- A version bump.
- A tokenizer for string literals.
- Any edit outside this repository.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `loop`: REQ-LOOP-001, REQ-LOOP-002, and REQ-LOOP-008 modified.
- `check`: REQ-CHK-007 added.
- `skills`: REQ-SKL-005 added.
- `distribution`: REQ-DIST-009 added.
- `metrics`: REQ-STAT-005 modified.
- `spec-governance`: REQ-GOV-009 modified.

## Impact

- `src/loop/next.ts`, `src/loop/fails.ts`: the `tasks` key and the cap question.
- `src/check/hints.ts`: the `dangling-ref` hint. One parity golden changes.
- `src/config.ts`, `src/cli/commands.ts`, `src/init/init.ts`, `src/adopt/write.ts`: one shared config reader.
- `src/stats/write.ts`, `src/util/time.ts`: a comment that names UTC.
- `skills/specctx-run/SKILL.md` and its packaged copy in `src/assets.generated.ts`.
- `openspec/config.yaml`, `README.md`, `CHANGELOG.md`, and `docs/verification/033.md`.
