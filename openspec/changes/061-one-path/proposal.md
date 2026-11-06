# Proposal

## Why

ADR-008 item 5 asks for one path for an existing project. Today a stranger cannot find it. A run on a copy of `tests/fixtures/no-id-repo` shows why.

- `init` ends with `next: specctx status`. Its specs have no IDs, so `status` says nothing about them, and `next` points at an OpenSpec artifact.
- `check` reports `missing-id 18`. `context add-mfa/1.1` prints the task and the uncited note, because a header without an ID is not an index entry.
- Only `adopt` fixes this. No output names it, except the `check` hint. The dogfood record lists six commands for the path: `init`, `adopt --dry-run`, `adopt`, `task backfill`, `baseline write`, `gate`.
- `adopt` ends with `next: specctx baseline write`. That step is debt bookkeeping. It is not the first value.
- `init` warns about an ignored `.claude/` only with `--skills`. It says nothing about `.agents/`.

## What changes

- `init` ends with a detection step. It reuses the adopt planner and writes nothing. When headers need an ID, it prints one summary line and the last line `next: specctx adopt`. When none do and the index holds an open task, the last line is `next: specctx context <task>`. Otherwise it stays `next: specctx status`. `--json` carries `needs_id` and `next`.
- `adopt` ends with `next: specctx context <first open task>`, or `next: specctx status` when no task is open. The `baseline write` command moves to the line before it, as a later step.
- `init` warns when `.gitignore` ignores `.claude/` or `.agents/`, with or without `--skills`. One note names the folders.
- The README gets `## Try it on your own OpenSpec repo` with three commands. `docs/reference.md` and `docs/getting-started.md` show the three command path first, then the gate steps.
- A record in `docs/verification/061.md`: the commands from `init` to the first useful `context <task>`, before and after, on a copy of the no-ID fixture.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `distribution`: ADDED REQ-DIST-017 (init names the next command from the state of the specs), REQ-DIST-018 (ignored agent folders). MODIFIED REQ-DIST-002, whose scenario SCN-DIST-002-7 states the old note.
- `adopt-existing`: ADDED REQ-ADOPT-011 (next command after adopt). MODIFIED REQ-ADOPT-002, which states the old `baseline write` line.
- `spec-governance`: ADDED REQ-GOV-014 (README block for an own repo).

## Layer and benefit

- Layer: layer 2 serving layer 1. It is item 5 of the order of work in ADR-008.
- Benefit: a stranger reaches a `context <task>` that holds spec blocks in 3 commands, and each command names the next one. Before, the stranger had to know `adopt`. The skills and the README give the same path, so an agent that runs `init` gets the command that makes layer 1 return linked specs. A warning about an ignored skills folder keeps the agent skills in git.
- The change adds no dependency, no server, no LLM call, and no cache. The output stays a pure function of the files.

## Out of scope

- `task backfill`, `baseline`, and `gate`. They stay as they are.
- Readable capability codes (ADR-008 item 7).
- The scanner glob finding of change 060.
- A change to `bench/recall`.
- Code and test lines in the first `context <task>`. They need a citation on the task, and that is the work of ADR-008 item 4 and the agent.
