# Proposal

## Why

ADR-006 phase 2 says the CI reruns the Verify command of each task that a pull request closed. It compares the exit code with the evidence. Today the agent writes the evidence on its own machine. Nothing checks it on another one. The GitHub Action is a later change. This change builds the engine half.

## What Changes

- `specctx gate --rerun [--base <ref>] [--json]` runs only the rerun step. The default gate does not run it.
- The closed tasks of a range come from the task IDs at the merge base and at HEAD, not from a line diff.
- The rerun compares each closed task in a fixed order. Manual evidence warns. Missing evidence, drift between tasks.md and the evidence, and a different exit code fail. A weak Verify fails under `--strict`.
- Tasks that share a frozen command and cwd run once.
- A guard env var stops a rerun that a rerun started.
- A failure prints the file and line, the evidence path, both exit codes, the output tail, and a line to reproduce it.
- The rerun appends one line to the gate log and never writes evidence.

Out of scope:

- `action.yml`, `action/run.sh`, and every workflow.
- The replay script.
- A `check` rule for network commands.
- Stats and a version bump.
- A comparison of stdout hashes.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `cli`: REQ-CLI-009 added.
- `verify-runner`: REQ-VER-005, REQ-VER-006, and REQ-VER-007 added.

## Impact

- New `src/gate/rerun.ts`, with pure functions for the closed set and the comparison.
- `src/cli/args.ts`, `src/cli/commands.ts`, `src/cli/help.ts`, and `src/cli/gate.ts` for the flag and the log.
- New tests under `tests/gate/`.
- `CHANGELOG.md`, `README.md`, `docs/verification/036.md`.
