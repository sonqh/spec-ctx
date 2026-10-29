# Design

## Context

`check` in `src/check/check.ts` returns a list of hard findings. Plain `check` prints no warnings. `check --strict` adds the `manual-evidence` warnings from `manualWarnings` in `src/check/evidence.ts`. `runCheck` in `src/cli/commands.ts` joins both and applies the baseline. `checkText` prints each finding in red and each warning as `warning: <rule> <id>`. A task entry in the index holds the full task body as its title. `parseVerify` in `src/verify/parse.ts` reads the Verify command from a task line, as `task done` runs it.

## Goals / Non-Goals

**Goals:**
- One rule with two levels. Advisory in plain `check`, hard in `check --strict`.
- The rule reads the same command that `task done` runs.

**Non-Goals:**
- A general judgement of how strong a command is.
- A change to `task done`. It still runs a weak command and writes evidence.

## Decisions

- D1 A new function `isWeakVerify(command)` lives in `src/verify/parse.ts` next to `parseVerify`. It trims the command and matches `true`, `:`, `exit` with whitespace and `0`, or `echo` with optional arguments that hold no `;`, `&`, `|`, or newline. A pure function keeps the rule testable without a project. This follows ADR-003, because the test is a fixed pattern with no model call.
- D2 `weakVerifyFindings(entries)` in `src/check/check.ts` walks the task entries that are not under `/archive/` and not in `main`. It runs `parseVerify` on the title and `isWeakVerify` on the command. A task with no Verify command already gets `task-without-verify`, so it gets no second finding. Each hit is a finding at the task line with the rule `weak-verify` and the task ID. No new ADR.
- D3 `check(root, cfg, data, strict)` adds the findings to the hard list only when `strict` is true. A new export `weakVerifyWarnings` returns the same hits as strings `weak-verify <task> <file>:<line>` for plain mode. `runCheck` adds them to the warnings when `strict` is false. The strict path keeps `manualWarnings` as it is. No new ADR.
- D4 `checkText` counts the file of a `weak-verify` warning from its third field. The `manual-evidence` branch keeps its `.ctx/evidence/<task>.json` file. The line still reads `warning: weak-verify <task> <file>:<line>`, so the agent sees where to edit.
- D5 `RULES` in `src/check/hints.ts` gets `weak-verify` with level `advisory` and the hint `Name a test file or a command whose exit code proves the task.` The level field names the plain-mode level. The strict path places it in the hard list, as `unknown-task-req` already does for a hard rule that only strict mode reports. The hint passes `lint ste --baseline 0` in Strict mode.
- D6 `BASELINE_RULES` in `src/baseline/baseline.ts` gets `weak-verify`, per ADR-006 and REQ-ADOPT-006. The existing path ends with `gate --strict` exit 0 on day one. A weak Verify on a legacy task is the same kind of debt as `task-without-verify`. The key is `weak-verify <task>`, as for every finding with an ID. A new weak Verify has no baseline line, so the ratchet still stops it. REQ-ADOPT-005 names the baseline rules, so its delta adds the rule under MODIFIED with every scenario.
- D7 `CITE_RULES` and `TASK_RULES` in `src/loop/next.ts` get `weak-verify`. `next` already calls `check` with `strict` true, so the finding reaches step 4 and gives `cite`. This extends ADR-006 step 4 and needs no new ADR.
- D8 The parity fixture plants four tasks with Verify: `true`. Plain `check` gains four warnings and `check --strict` gains four hard findings. The goldens change with `tests/parity/run.sh --record`. `docs/verification/028.md` names the reason. The fixture stays as it is, because the goldens must show the rule.
- D9 Some unit tests build a project with Verify: `true` and expect a clean result from `check --strict`, `gate`, or `next`. Where such a test fails, its Verify changes to a real command such as `node -e 0`. Tests that run `task done` with `true` and never call strict check keep `true`.
- D10 `warningKey` in `src/baseline/baseline.ts` keeps the first two fields of a warning. A plain-mode `weak-verify` warning then has the same key as the strict finding, and the baseline hides it in both modes. A `manual-evidence` warning has two fields, so its key does not change. No new ADR.

## Risks / Trade-offs

- [A project that uses `echo` as a placeholder sees new hard findings in strict mode] → The hint names the fix. The rule fires only for active changes.
- [The pattern misses a weak command such as `exit 0;` or `sh -c true`] → The request names four forms. A wider list is a later change.
- [`node -e 0` in tests is weak too, but the rule does not read it] → It is test data for other rules. The rule reads only the four forms by design.

## Open Questions

None.
