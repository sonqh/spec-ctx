# Proposal

## Why

`check --strict` skips the test rules for the delta of an active change while one of its tasks is open (038/D2, REQ-CHK-008, REQ-CHK-009). The skip is silent. During the build, `check --strict` prints `0 findings` and exits 0. A reader takes that as full coverage. The delta requirements and scenarios were not checked at all.

This is the same fault as change 050. An answer must never look more complete than it is (ADR-008 item 5).

## What changes

- `check --strict` prints one line for each active change with an open task or no task. The change must hold at least one delta requirement or scenario with no test:
  `deferred: <change>  <n> untested delta items, <k> open tasks`
- `check --strict --json` adds a `deferred` array. Each item is `{ "change", "untested", "open" }`. The array is `[]` when nothing defers. Plain `check --json` stays as it is.
- The `deferred:` lines come after the rule lines and before the `baselined:` line. The `baselined:` line stays last.
- No exit code changes. The change adds no finding. The baseline does not hold a deferred line.
- The rules of REQ-CHK-008 and REQ-CHK-009 do not change.
- `gate` prints no `deferred:` line. Only the `check` case of `check` computes it.
- Specs: new REQ-CHK-010. MODIFIED REQ-CHK-004, because it says that the `--json` output stays fixed and that the rule lines end the human output.
- The line also covers a change with delta items and no task, with `0 open tasks`. The rule skipped that case before, and nothing said so.
- Docs: CHANGELOG, the README sentence on open tasks, and the verification record.

## Layers and benefit

- Layer: it keeps the links true, the support layer of ADR-007 item 4. It serves ADR-008 item 5, trust in the output.
- Benefit: a clean `check --strict` shows what it left unchecked. An agent in the loop can read the `deferred` field and not claim coverage.
- It fixes a silent skip. It adds no gate feature, no linter, no Action change, and no loop action. The freeze of ADR-008 item 4 allows bug fixes. `gate` keeps its behavior.

## Out of scope

- A deferred notice in `gate`, in `next`, or in the Action.
- Plain `check`. The test rules run only in strict mode.
- A version bump or a release.

## Capabilities

### Modified Capabilities
- `check`: REQ-CHK-010 added. REQ-CHK-004 modified.

## Impact

- `src/check/check.ts` and `src/cli/commands.ts`.
- `tests/check/deferred.test.ts` and the golden `tests/fixtures/parity-golden/check-strict.out`.
