# Proposal

## Why

The third dogfood run found five gaps in the loop.

- The archive stop has no way to record an approval. After a human approves, `next` still returns `archive` with `human: true`.
- A later task can make the evidence of an earlier task stale. Only `gate` sees it, so the loop runs to the gate and fails there.
- The `stale-evidence` hint does not name the `<why>` argument of `task reopen`.
- The `retitle-needs-renamed` hint is one static string. It does not show the RENAMED block in the form of the headers.
- The skill runs only `openspec validate <c> --strict` at the plan step. The spec-length check of the gate runs too late.

## What Changes

- `handoff ask --change <c>` records the stage of the change in a new `stage` field of the question. The stage is `archive` when every task of the change is `[x]`. Otherwise it is `plan`.
- At the archive stop, `next` returns the command `specctx handoff ask --change <c> "archive <c>?"`. While the question is open, `next` returns `ask`. After `handoff resolve`, `next` returns `archive` with `human: false`.
- `next` returns `repair` for the earliest task of the change with stale evidence. The command reopens the task and runs `task done` again.
- The `stale-evidence` hint names `task reopen <task> <why>`.
- A check finding can carry its own hint text. `retitle-needs-renamed` uses it to print the RENAMED block with the real headers. The other rules print the same output as today. `check --json` does not change.
- The `specctx-run` skill runs `specctx gate --strict` at the plan step, names `id new --count <n>`, and covers the archive stop after an approval.

Out of scope:

- A new action in the closed enum of `next`.
- A new state file under `.ctx/`.
- The `[loop] archive = "auto"` path. It keeps `human: false` with no question.
- A grouped RENAMED block for two retitles in one delta file.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `cli`: REQ-CLI-007 modified, only in SCN-CLI-007-6.
- `loop`: REQ-LOOP-001 modified. REQ-LOOP-007 and REQ-LOOP-008 added.
- `check`: REQ-CHK-006 added.
- `skills`: REQ-SKL-004 added.

## Impact

- `src/loop/next.ts`, `src/handoff/questions.ts`, `src/handoff/handoff.ts`, `src/cli/workflow.ts`.
- `src/check/check.ts`, `src/check/evidence.ts`, `src/check/hints.ts`, `src/cli/commands.ts`.
- `skills/specctx-run/SKILL.md` and its two copies.
- `tests/loop/`, `tests/check/`, `tests/skills/`, `tests/adopt/`.
- `README.md`, `CHANGELOG.md`, `docs/verification/031.md`.
