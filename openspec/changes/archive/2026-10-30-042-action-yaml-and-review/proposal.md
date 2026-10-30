# Proposal

## Why

CI fails on `main`. The `action-selftest` workflow fails on `action.yml` because the `description` of the `rerun` input is a plain YAML scalar that holds `base: ${{ github.event.before }}`. A review of the same commit found three more traps in the gate log, the push base, and the `Covers:` parser.

## What Changes

- `action.yml` names `github.event.before` in words and holds no `${{` in a `description`. A `description` with `: ` gets quotes. A shell check in `tests/action/selftest.sh` fails on an unquoted one. The repository has no YAML parser, so the check is a deterministic text rule.
- The gate log line gets a `strict` boolean. `next` accepts only a passing line with `strict: true`. A line without the key does not count.
- `gate --rerun` with a base of forty zeros prints one line and exits 0. A base that git cannot resolve prints one line that tells the user to fetch it and exits 1.
- The `Covers:` parser reads every REQ ID on the rest of the line, with word boundaries. SCN IDs, spaces, and `;` no longer drop the rest of the line.

Out of scope:

- A version bump.
- Stats.
- New commands.
- Any other change to the plan stop or the archive stop.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `distribution`: REQ-DIST-014 added.
- `verify-runner`: REQ-VER-013 added.
- `index`: REQ-IDX-007 added.
- `loop`: REQ-LOOP-011 modified.
- `metrics`: REQ-STAT-005 modified.

## Impact

- `action.yml`, `tests/action/`, `src/cli/gate.ts`, `src/gate/rerun.ts`, `src/loop/next.ts`, `src/index/scan.ts`.
- README, CHANGELOG, `docs/verification/042.md`.
- Old gate log lines no longer count for `next`. The next `gate --strict` writes a counting line.
