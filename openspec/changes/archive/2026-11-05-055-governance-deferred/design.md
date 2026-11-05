# Design

## Context

- `check --strict` prints the summary, one line per rule present, then the `deferred:` lines (REQ-CHK-010) and the `baselined:` line (REQ-CHK-004).
- `tests/gov/governance.test.ts` SCN-GOV-001-1 knows only the summary and the `manual-evidence` lines.

## Goals / Non-Goals

**Goals:**
- SCN-GOV-001-1 passes with and without an active change.

**Non-Goals:**
- A change to `check`.

## Decisions

- D1 The test removes every line that starts with `deferred: ` before it filters and before it matches the summary. The notice of REQ-CHK-010 is advisory by its spec. Refs: REQ-GOV-001, REQ-CHK-004
- D2 SCN-GOV-001-2 makes the active change in the copy, so the case does not depend on the state of the repository at test time.
  - `openspec/changes/zz-open/proposal.md`.
  - `tasks.md` with one open task that cites `[REQ-GOV-001]` and has a Verify command that is not weak.
  - A delta that MODIFIES REQ-GOV-001 with its exact main title and adds one scenario that no test names. `deferredOf` in `src/check/check.ts` reports a change only when it has such a gap.
  - The test builds that scenario ID from two strings, `"SCN-GOV-001-" + "99"`. The scanner counts any SCN literal in a test file as tested, so a literal would close the gap.

  The case expects exit 0, `0 findings`, and a line that starts with `deferred: zz-open  `. It asserts no count of `deferred:` lines, because an open change of the branch adds its own. Refs: REQ-GOV-001
- D3 Evidence for the cause. The `ci:local` run on `feat/recall-benchmark` at beb8fa4 failed with `deferred: 054-recall-benchmark  6 untested delta items, 5 open tasks` as the only extra line. `docs/verification/055.md` keeps it. Refs: REQ-GOV-001

## Risks / Trade-offs

- A future notice line after the summary needs the same filter. The filter names the prefix, so a new kind of line still fails the test, and that is the intent.
