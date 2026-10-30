# Proposal

## Why

An agent has no single command for "what do I need before I edit". It picks `query`, `related`, or `bundle`, and `task start` runs its own call. Measured on 2026-10-30 at HEAD e3f6eec:

- `task start` already keeps every code and test line for the tasks that cite requirements. It keeps 2 of 2 for `045/2.1`, 13 of 13 for `046/2.1`, and 9 of 9 for `044/1.1`. It passes the cited requirements as the start, so their lines sit at depth 1.
- The gains of this change are elsewhere:
  - `bundle <task>` keeps 0 of those lines (0 of 2, 0 of 13, 0 of 9). They sit at depth 2 from the task. After the change it keeps all of them.
  - A task that cites no requirement gets 238 characters from `task start` on the external repository. Its `context` answer holds 1,384 characters.
  - `task start` prints the deltas of the change and the designs of the task, which it never did.
  - One front door, `context`, answers for a task, a requirement, a file, or a change. `bundle` of a file keeps 0 of the 2 test and code lines of its requirements. `context` of a file keeps both.
- The next change is the `--since <ref>` query, which asks what changed since a ref.

## How this makes query better

Layer 1, retrieval, and the layer 2 hook that ADR-007 item 3 asks for.

- `specctx context <task|ID|file|change>` is the one front door. It is the documented name of the `bundle` answer for one input. It has no retrieval path of its own.
- A task reaches the code and test lines of the requirements it cites. They join class 1 of the budget, and the cited requirements join class 0.
- A file reaches the code and test lines of the requirements it tags, so its own tests appear.
- `task start` prints the `context` answer for the task. The skills get the layer 1 answer, and the evidence, current task, and Verify behavior stay the same.

## What Changes

- `src/graph/bundle.ts` gets the task rule and the file rule.
- `src/graph/input.ts` holds the input resolution that `bundle` used in `commands.ts`. `bundle` and `context` both call it.
- `context` is a new command with one input. `bundle` stays for several inputs, `--block`, and `--all`.
- `task start` calls the same function with the task ID and the task entry. `task next` prints a `context` command in `bundle_command`.

Out of scope:

- `--since <ref>`. It is the next change.
- The benchmark, speed work, and a version bump.
- `related`. Its depth list is not a budget, and its answer for a file keeps REQ-QRY-005 as it is.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `query`: REQ-QRY-015, REQ-QRY-016, and REQ-QRY-017 added. REQ-QRY-005 modified.
- `task-workflow`: REQ-TASK-007 added and REQ-TASK-002 modified. `task start` prints the `context` answer. `task next` prints a `context` command.
- Stats: `bundle_chars` and `context_ratio` change meaning here. The record and the README mark the break.

## Impact

- `src/graph/bundle.ts`, `src/graph/input.ts`, `src/cli/commands.ts`, `src/cli/args.ts`, `src/cli/help.ts`, `src/cli/workflow.ts`.
- The help goldens change.
- `README.md`, `docs/getting-started.md`, `CHANGELOG.md`, `docs/verification/047.md`.
