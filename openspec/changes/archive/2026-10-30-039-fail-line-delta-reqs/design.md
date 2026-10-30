# Design

## Context

- `failLine` matches `fail:` and `FAIL`. A `bun test` failure line starts with `(fail)`.
- Change 038 added a delta rule for scenarios in `src/check/check.ts`. It builds `tasksOf` and the `pending` set.

## Goals / Non-Goals

**Goals:**
- The attempt-cap question quotes the failed test of `bun test`.
- The archive brings no new `uncovered` finding.

**Non-Goals:**
- Stats, `next`, the action, and a new command.

## Decisions

- D1 `failLine` adds `(fail)` to the prefixes. It keeps the order, the trim, the case rule, and the fallback. Refs: REQ-LOOP-006
- D2 The delta requirement rule reuses `tasksOf` and `pending` of the 038 code. It runs for entries of kind `req` with status `active` or `modified`. Refs: REQ-CHK-009
- D3 The rule is a new requirement. REQ-CHK-008 keeps its text, because its title names scenarios. Refs: REQ-CHK-009
