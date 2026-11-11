## Why

Two bugs cost a manual step at every archive (ADR-010 item 3.4).

- `openspec archive` writes `TBD - created by archiving change <c>. Update Purpose after archive.` as the Purpose of a new capability. `openspec validate --all --strict` then fails on that spec. Reproduced with OpenSpec 1.x on a scratch repo. The same CLI copies a `## Purpose` section of the delta into the new main spec, so the text can come from the change.
- `stats --write` rebuilds the whole file of the day. Old change rows move because their context ratio divides by the current spec size. The gate rows fall when the local log is shorter than at the last write. In changes 064 to 066 they fell from 49 runs to 28. The lead restored the file from HEAD each time. The README total row is a separate hand edit.

## What Changes

- `check --strict` reports `delta-without-purpose` for a delta of a new capability with no `## Purpose`, and `placeholder-purpose` for a main spec that holds a `TBD` or `TODO` Purpose (REQ-CHK-011).
- `next` refuses the archive action while `delta-without-purpose` stands, and prints the fix (REQ-LOOP-019).
- `stats --write` keeps the old rows of the file of the day and adds rows for new changes. It keeps the gate rows when the log is shorter (REQ-STAT-009, REQ-STAT-005).
- `stats --write` sets the total row and the newest file path under `## Measured` in README.md (REQ-STAT-010).
- The archive guidance in `openspec/config.yaml` drops the hand step for the total row and gains the Purpose step (REQ-GOV-009).

## Layer and benefit

Layer 2, loop hygiene, and a bug fix (ADR-007 item 3 and item 7). The archive runs end to end with no manual restore and no manual README edit, so the skills reach the archive with the links true. Layer 1 does not change.

## Out of scope

- No rewrite of existing main specs.
- No change to the OpenSpec CLI.
- No new file format for metrics. A new day still writes a new file.
- No Purpose rule in plain `check`.
