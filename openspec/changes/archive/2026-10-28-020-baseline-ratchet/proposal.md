# Proposal

## Why

`baseline write` replaces `.ctx/baseline.json` with every current finding. Nothing compares the file to the base branch. A pull request can run `baseline write`, hide new debt, and get a green gate in CI. The architecture review of 2026-10-28 names this as finding 2. ADR-006 item 6 sets the fix: `gate` fails when the baseline gained entries against the merge base, unless the commit subject starts with `baseline:`. That is the same pattern as REQ-GOV-007 for the version field.

## What Changes

- `gate` gets a step `baseline` between `check` and the linters. The steps are `check`, `baseline`, `lint tells`, `lint ste`, `validate`, `spec-length`.
- The step reads `.ctx/baseline.json` at `git merge-base HEAD <base>`, where `<base>` is `[gate] base` in `spec-ctx.toml`, default `origin/main`. It compares the two files as sets of lines. For a `lint <file> <rule> <count>` line it compares the count. A new line or a higher count is new debt. The step prints `baseline: fail, <n> new entr(y|ies)` and one line per entry, at most 50.
- When the project has no git, no merge base, or no baseline file at the merge base, the step prints `baseline: skipped (<reason>)` and passes.
- When the subject of HEAD starts with `baseline:`, the step prints `baseline: ok (baseline: commit)` and passes. The env var `SPECCTX_BASELINE_SUBJECT` replaces the subject for tests.
- `spec-ctx.toml` gets `[gate] base` with the default `origin/main`. `init` writes the key with a comment.
- The `specs` job of this repository checks out with `fetch-depth: 0`, so `origin/main` exists on a pull request.
- New requirement REQ-ADOPT-008 with three scenarios. REQ-CLI-004 gets SCN-CLI-004-7.

Out of scope: a baseline that gains entries on `main` itself after a push. The merge base of `main` with `origin/main` is `HEAD`, so the step compares the file with itself and passes. The pull request gate is the place where the ratchet holds.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `adopt-existing`: REQ-ADOPT-008 added.
- `cli`: REQ-CLI-004.

## Impact

- `src/cli/gate.ts`, `src/baseline/ratchet.ts` (new), `src/cli/commands.ts`, `src/config.ts` (one key).
- `tests/cli/gate.test.ts`, `tests/baseline/ratchet.test.ts` (new), `tests/config.test.ts` (key count).
- `.github/workflows/ci.yml`, `README.md`, `CHANGELOG.md`.
