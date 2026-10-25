# check (delta)

## ADDED Requirements

### Requirement: REQ-CHK-004 Duplicate change key and summary
`check` SHALL report `duplicate-change-key` as a hard finding when two change folders, active or archived, resolve to one key. Human output SHALL end with one summary line `<n> findings in <m> files (<h> hard, <a> advisory)` and one line per rule present: `<rule>  <count>  <hint>`. Hints SHALL live in one table beside the rule definitions. `--json` output SHALL not change.

Refs: REQ-IDX-005

#### Scenario: SCN-CHK-004-1 Duplicate key
- **WHEN** both `001-a` and `001-b` exist under `openspec/changes/`
- **THEN** `check` prints `duplicate-change-key 001` as hard and exits 1

#### Scenario: SCN-CHK-004-2 Summary line
- **WHEN** `check --strict` finds 3 `uncovered` and 1 `req-without-scn` in two files
- **THEN** the output ends with `4 findings in 2 files (4 hard, 0 advisory)` and a line for each of the two rules with its hint

#### Scenario: SCN-CHK-004-3 Clean
- **WHEN** `check` finds nothing
- **THEN** it prints `0 findings` and exits 0
