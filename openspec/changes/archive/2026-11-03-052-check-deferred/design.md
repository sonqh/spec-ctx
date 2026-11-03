# Design

## Context

- `check()` in `src/check/check.ts` builds `tasksOf` per change: the count of open tasks and of all tasks. A delta item of a change with an open task gets no `uncovered` or `scenario-untested` finding (038/D1, 038/D2).
- 038/D1 reused `scn_named` and set the delta rule to run for entries with status `active` or `modified`. 039/D2 added `tasksOf` and `pending` for requirements. The skip is silent by design, so the plan step stays green.
- `check --strict` prints `0 findings` for such a change. `--json` prints `{ baselined, count, findings, warnings }`. `gate` prints `check: ok (strict)` and the check output only on failure.
- The parity fixture `007-parity-plant` has four open tasks, so the golden `check-strict.out` will get a `deferred:` line.
- REQ-CHK-004 says that `--json` output does not change, and that human output ends with the summary and the rule lines.
- Tests that run `check --strict` on a fixture with an open task assert the exact output. `tests/baseline/baseline.test.ts`, `tests/check/evidence.test.ts`, `tests/check/strict.test.ts`, and `tests/check/dupkey.test.ts` need a `deferred:` line in their expectation. The fixtures stay as they are.

## Goals / Non-Goals

**Goals:**
- A clean strict result shows what the open tasks left unchecked.
- The exit code, the findings, and the plain `check` output stay as they are.

**Non-Goals:**
- A change to when a finding appears.
- A notice in `gate`, `next`, or the Action.

## Decisions

- D1 One helper owns the predicate. `deltaGaps` in `src/check/check.ts` holds `tasksOf`, `pending`, and the delta filter: kind `req` or `scn`, status `active` or `modified`, not in `pending`, and no `Covers:` tag or test name. It returns, for each change, `{ open, all, items }`. `items` holds each gap once, keyed by file, line, rule, and ID, like `uniq` in `check()`. The rule reads the gaps of a change where `open === 0` and `all > 0`. `deferredOf` reads them where `!t || t.open > 0`, so the line also covers a change with delta items and no task, with `0 open tasks`. So the count matches the findings that a missing or open task hides, before the baseline. The count does not read `.ctx/baseline.json`, so a baselined gap still counts in `untested`. `check()` keeps its return type, so `stats` does not change. Refs: REQ-CHK-010, REQ-CHK-008, REQ-CHK-009
- D2 A change with open tasks and zero untested items prints no line. A line that says "0 untested" adds noise. Refs: REQ-CHK-010
- D3 Text format: `deferred: <change>  <n> untested delta items, <k> open tasks`, with `item` and `task` in the singular when the count is 1 (`n === 1 ? "" : "s"`). The text is a contract, so it reads right. Two spaces follow the change key, as the finding lines use. The lines sort by change key with `cmpTuple`, not `localeCompare`, so the order is the same on every machine. They print after the rule lines and before `baselined:`, so `baselined:` stays last (REQ-CHK-002). A clean result prints `0 findings`, then the `deferred:` lines. A `deferred:` line is not a finding. It is not in the count, the summary, or the baseline. Refs: REQ-CHK-010, REQ-CHK-002, REQ-CHK-004
- D4 JSON: `deferred` is an array of `{ change, untested, open }`. It is in every `check --strict --json` result, and it is `[]` when nothing defers. Plain `check --json` keeps its shape, so SCN-CLI-002-2 holds. REQ-CHK-004 gets two edits. The JSON clause says "except for REQ-CHK-010". The human clause says that only the `deferred:` lines and the `baselined:` line follow the rule lines. Refs: REQ-CHK-010, REQ-CHK-004
- D5 The exit code stays `findings.length ? 1 : 0`. `gate` stays as it is in code. The `check` case of `src/cli/commands.ts` alone calls `deferredOf` and passes the result to `checkText` as an optional last argument. `runCheck` and its result do not change, so the `check` step of `gate` never prints a `deferred:` line. Refs: REQ-CHK-010
- D6 Layer: it keeps the links true (ADR-007 item 4) and serves ADR-008 item 5. It fixes a silent skip, so the freeze of ADR-008 item 4 allows it. Refs: ADR-007
