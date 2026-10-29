# Design

## Context

See proposal.md for the friction list. The facts below come from the code.

- `next` step 2 already blocks a change on an open question. It matches when the `task` of the question equals the change folder, equals the change key, or starts with `<key>/`.
- `handoff ask` stores `currentTask(root)` as `task`. That is the task in `.ctx/current.json`, or `none`. At the plan stop no task of the new change is current. So the question carries `none` or a stale task of an older change, and step 2 never matches it.
- The `fix` reason takes `stderr_tail.split("\n")[0]`. With `bun test` that line is the command banner.
- `DEBT_RULES` in `src/stats/stats.ts` lists four rules. `BASELINE_RULES` lists eight.

## Goals / Non-Goals

**Goals:**
- The plan stop holds in the engine for any agent or script that reads `next`.
- The reason of `fix` names the failing test where the runner prints one.

**Non-Goals:**
- A change to the decision order of `next`.
- A change to the question text at the attempt cap.

## Decisions

- D1 `handoff ask` gets the flag `--change <c>`. The flag resolves `<c>` against the active change folders with `matchesChange`, so the key or the full folder name works. The question stores the full folder name as `task`. A `<c>` with no active folder exits 2 with `no active change <c>`. Without the flag, `ask` keeps the current task. Step 2 of `next` stays as it is, because it already matches the folder name. The alternative was a new `.ctx/plan-approved` file. The request forbids a new state file. Refs: REQ-LOOP-005, REQ-HND-002, ADR-006
- D2 REQ-HND-002 stays as it is. Its text is near the 500 character limit of `openspec validate --strict`, and the delta rules forbid a trim of existing text. REQ-LOOP-005 states the flag and says it replaces the current task. Refs: REQ-LOOP-005
- D3 A new function `failLine(tail)` in `src/loop/fails.ts` picks the reason line. It splits the tail on new lines and trims the end of each line. It returns the last line whose trimmed start begins with `fail:` or `FAIL`. Else it returns the last non-empty line, trimmed. Else it returns `no output`. The match is case sensitive. So vitest ` FAIL  tests/x.test.ts` matches, and `bun test` `1 fail` does not. The `attempts_exhausted` reason uses the same function, because it is the same variable. Refs: REQ-LOOP-006
- D4 `capQuestion` keeps the first line of the tail. SCN-LOOP-002-2 fixes that text, and the request names only the `fix` reason. Refs: REQ-LOOP-002
- D5 `DEBT_RULES` gains `task-without-verify` and `weak-verify`. The change row of `stats` counts task scoped debt. Both new rules carry a task ID, so the change row counts them too, next to `done-without-evidence` and `manual-evidence`. Refs: REQ-STAT-004
- D6 The skill keeps its shape from 025/D1: four loop lines, one bullet per action, a rules list. `plan` and `archive` get the new steps. The top line names the default OpenSpec command. `plan` points to the upstream `openspec-propose` skill for the artifacts, but the skill overrides two of its steps. It reads requirements with `specctx bundle` or `specctx query`, and it ends with `specctx handoff ask --change <c>`. The three copies under `skills/`, `.claude/skills/`, and `.agents/skills/` stay equal. `tests/init/drift.test.ts` checks that. Refs: REQ-SKL-001, REQ-SKL-003, 025/D1
- D7 The help page of `handoff ask` lists `--change <c>`. The help golden changes with `SPECCTX_HELP_RECORD=1`. The verification record names the reason. Refs: REQ-CLI-001
- D8 ADR-002 gets the row `| LOOP | loop |` after `LINT`. The table then matches `[ids] caps` in `spec-ctx.toml`. Refs: ADR-002, REQ-GOV-001

## Risks / Trade-offs

- [The new debt rules raise the `debt` total in `stats` and in the README `## Measured` row] → This repository has no `task-without-verify` or `weak-verify` finding today. So the number does not move. The verification record states the count before and after.
- [An agent at the plan stop runs `ask` without `--change`] → The question then carries the current task and does not block. The skill names the full command, and SCN-SKL-003-1 tests that text.
- [A runner prints `FAIL` in a passing summary line] → The reason shows only after a non zero exit. So the line names a real failure in practice.
