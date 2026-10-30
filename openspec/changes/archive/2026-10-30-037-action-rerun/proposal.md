# Proposal

## Why

ADR-006 phase 2 says the CI reruns the Verify command of each task that a pull request closed. Change 036 built the engine half, `specctx gate --rerun`. Nothing in CI calls it yet. This change adds the GitHub Action half.

## What Changes

- `action.yml` gets the inputs `rerun` and `base`. With `rerun: true`, `action/run.sh` runs `gate --rerun` and no other gate step. The script only builds the command line.
- `action/run.sh` exits 1 with one line on `pull_request_target` when `rerun` is true. A Verify command is code from the pull request.
- `ci.yml` gets a job `rerun`. It runs on `pull_request` only, with read-only permissions and full history.
- `tests/action/` gets a rerun case on a temp git repo, and checks of the job and the docs.
- The README action section states the security boundary in bullets.
- Small fix: the `reproduce:` line of a mismatch quotes the cwd, so a path with spaces still pastes.

Out of scope:

- The replay script.
- New `check` rules.
- Stats and a version bump.
- Any change to the default gate.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `distribution`: REQ-DIST-005 changed. REQ-DIST-010, REQ-DIST-011, and REQ-DIST-012 added.
- `spec-governance`: REQ-GOV-010 added.
- `verify-runner`: REQ-VER-007 changed.

## Impact

- `action.yml`, `action/run.sh`, `.github/workflows/ci.yml`, and `src/gate/rerun.ts`.
- New `tests/action/rerun.sh`, `tests/action/rerun-job.sh`, and `tests/action/rerun-docs.sh`. Changed `tests/action/selftest.sh` and `tests/gate/compare.test.ts`.
- `README.md`, `CHANGELOG.md`, and `docs/verification/037.md`.
- The new job runs on GitHub only after a push. `docs/verification/037.md` says so.
