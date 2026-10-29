# Proposal

## Why

A task closes when its Verify command exits 0. A Verify command such as `true` or `echo ok` always exits 0. So the task closes and the evidence proves nothing. `check` reads only whether a task line has `Verify:` and a code span. It does not read what the command does. An agent can close every task of a change with `true`, and `check --strict` passes.

## What Changes

- New check rule `weak-verify`. It fires on a task line of an active change when the Verify command is only `true`, `:`, `exit 0`, or a lone `echo ...`. Whitespace around the command does not change the result.
- The rule reads the command that `task done` runs. Two or more code spans join with `&&` first. A `cwd=<path>` prefix comes off first.
- Plain `check` prints the finding as a warning, counts it as advisory, and keeps exit 0.
- `check --strict` prints it as a hard finding and exits 1. So `gate --strict` fails on it too.
- `weak-verify` joins the baseline rules. `baseline write` records a legacy weak Verify, so an existing project passes `gate --strict` on day one. A new weak Verify has no baseline line and fires.
- The hint tells the agent to name a test file or a command whose exit code proves the task.
- `specctx next` returns `cite` for a weak Verify command, before the task starts. The agent then fixes the task line before the work.
- No task line under `openspec/` of this repository fires today, active or archived. A task that fires during this change gets a real command. No baseline entry hides it.
- The parity goldens for `check` and `check --strict` change, because the planted fixture uses `true`. The verification record names the reason.

Out of scope:

- A Verify command that runs a real program but proves little, such as `ls` or `cat file`. The rule reads only the four forms.
- Tasks of archived changes. They are history.
- Tasks in test fixtures that test other rules. They change only where a test needs a clean `check --strict`.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `check`: REQ-CHK-005 added.
- `loop`: REQ-LOOP-004 added.
- `adopt-existing`: REQ-ADOPT-005 modified. Its list of baseline rules names `weak-verify`.

## Impact

- `src/check/check.ts`, `src/check/hints.ts`, `src/cli/commands.ts`, `src/loop/next.ts`, `src/verify/parse.ts`, `src/baseline/baseline.ts`.
- `tests/check/`, `tests/loop/next.test.ts`, `tests/baseline/`, and the tests whose fixtures use `true` with `check --strict`.
- `tests/fixtures/parity-golden/check.out`, `tests/fixtures/parity-golden/check-strict.out`.
- `README.md`, `CHANGELOG.md`, `docs/verification/028.md`.
