# Proposal

## Why

Two failures showed up while agentrc was built with the Python engine. An agent allocated IDs by counting `max + 1` by hand, and nothing stopped a reused or skipped number. An agent ticked a task `[x]` by hand, and nothing tied that tick to a passing check or to the code it covered. Both are state that the tool should own. This change adds ID allocation, a task state machine with evidence, a runner for `Verify:` commands, and a generated handoff.

## What Changes

- `specctx id new <KIND> <CAP>` allocates the next number and `specctx id retire <ID> "<reason>"` records a removal.
- `specctx task next`, `task start <id>`, `task done <id>`: the only path that writes a checkbox. `done` runs the task's `Verify:` command and writes an evidence file.
- `Verify:` is read from a code span. Prose Verify still works and produces manual evidence with a warning.
- `specctx handoff write` generates `.ctx/handoff.md` from the index and the evidence. `status` reads it.
- New check rules: `done-without-evidence`, `stale-evidence`, `evidence-without-done`.

Out of scope: dependency syntax between tasks beyond order within a group, parallel task claims by several agents, schema bundle and skills (003).

## Capabilities

### New Capabilities
- `id-allocation`: next number, retire, registry of codes.
- `task-workflow`: next, start, done, the checkbox contract.
- `verify-runner`: how a Verify command is parsed, run, and recorded.
- `handoff`: the generated session handoff.

### Modified Capabilities
- `check`: evidence rules.
- `cli`: new commands and exit codes.

## Impact

- `src/ids/`, `src/tasks/`, `src/verify/`, `src/handoff/`, `.ctx/evidence/`.
- `tasks.md` format gains nothing new except the code span after `Verify:`. OpenSpec still reads it.
