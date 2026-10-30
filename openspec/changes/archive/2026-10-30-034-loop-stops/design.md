# Design

## Context

The facts below come from the code.

- `decideNext` in `src/loop/next.ts` returns `start` as soon as planning is complete and no citation gap exists. Only the skill text holds the plan stop.
- `addQuestion` stores `stage: plan` or `stage: archive` for `handoff ask --change`. The archive stop reads it (REQ-LOOP-007).
- `src/config.ts` has `[loop] max_attempts` and `[loop] archive`. No key governs the plan stop.
- `bundle` prints a provenance line, related entries, and a trailer. `blockText` in `src/graph/bundle.ts` already returns the block of a requirement with its scenarios.
- `init --skills --force` rewrites the copies in `.claude/skills` and `.agents/skills` from `ASSETS`, which `bun run build` writes from `skills/`. The drift test names `init --skills --force` without the build.

## Goals / Non-Goals

**Goals:**
- The engine, not the agent, owns the plan stop.
- An agent writes a MODIFIED delta without opening a spec file.

**Non-Goals:**
- A new sync command.
- A config switch for the plan stop.

## Decisions

- D1 `decideNext` gets a plan stop rule after the citation rule and before the repair rule. It fires when planning is complete and no task has `[x]`. It also needs no current task and no question with `stage: plan`. It returns `ask`, `human: true`, state `plan_stop`, and the command `specctx handoff ask --change <folder> "plan ready for <folder>. Approve to start the tasks?"`. The guard keeps a change that began before this rule from stopping again. The request names only the missing question, so the guard extends it. The lead should confirm it. No config switch exists, so the change adds none. Refs: REQ-LOOP-009, REQ-LOOP-005, REQ-LOOP-007, ADR-006
- D2 `bundle` gets the flag `--block`. It prints `blockText` of each canonical REQ, joined by one blank line, with no provenance line, no related entry, and no trailer. `--budget` and `--depth` have no effect. An ID that is not a REQ exits 2. A flag on `bundle` saves a new command. Refs: REQ-QRY-004, REQ-QRY-003, ADR-003
- D3 The refresh command exists. It is `bun run build && node dist/cli.js init --skills --force`. The build comes first because `ASSETS` holds the compiled copy. The drift test message names it. The skill gets one line. The change adds no sync code. Refs: REQ-SKL-006, REQ-SKL-002
- D4 In the current task branch, `decideNext` lists the stale tasks of the change and appends `stale waiting: <t>, <t>` to the reason. With a fail reason, a period and a space come first. `action`, `task`, `tasks`, and `command` stay. Refs: REQ-LOOP-010, REQ-LOOP-008
- D5 The `plan` bullet of the skill ends with "Then run `specctx next --json` and run the command it prints. This is the plan stop." REQ-SKL-003 and its scenario SCN-SKL-003-1 change to match. The Rules list gets four short lines for the block flag, the sync, the Refs count, and the CHANGELOG heading. The skill stays under 60 lines. Refs: REQ-SKL-003, REQ-SKL-006, REQ-SKL-004

## Risks / Trade-offs

- Tests that expect `start` after planning now see `ask`. Mitigation: each gets a resolved plan question in the same task.
- The skill ran the plan stop from memory before. An old copy of the skill still works, because the command is the same text.
