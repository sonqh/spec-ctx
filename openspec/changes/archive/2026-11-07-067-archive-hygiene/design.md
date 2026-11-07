## Context

Layer 2 bug fix. It keeps the archive hand-off clean. It creates no ADR.

## Decisions

- D1 The fix for the TBD Purpose lives in the delta, not in a post-archive edit. OpenSpec copies a `## Purpose` section of the delta when it creates the main spec. A check before the archive is deterministic: the delta exists and no main spec for the capability exists. REQ-CHK-011.
- D2 The new rules run in `check --strict` only. Plain `check` runs in the pre-commit hook during planning, when a Purpose is not due. REQ-CHK-011.
- D3 `next` checks the delta rule before the gate step and returns `gate` with `check --strict`. The action list stays closed. REQ-LOOP-019.
- D4 `placeholder-purpose` reads each `openspec/specs/*/spec.md`. It is a warning in both modes, because `validate --strict` in the gate already fails it. `next` calls `src/check/purpose.ts` and does not copy the rule.
- D5 A row of the file of the day is a change row of the table, the gate table, and the total row. `stats --write` reads the table of the file, keeps each change line as written, adds lines for new changes, and recomputes the total. The three gate rows stay or change as one set, and `spec_chars` comes from the file. REQ-STAT-009.
- D6 `stats --write` edits the README itself. The guidance then needs no hand step. The edit touches only the path line and the total row. REQ-STAT-010.
