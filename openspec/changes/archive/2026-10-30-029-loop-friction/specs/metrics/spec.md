# Spec Delta

## MODIFIED Requirements

### Requirement: REQ-STAT-004 Cycle time and debt
`cycle_time_median_s` SHALL be the median of evidence `at` minus the `started_at` that `task start` wrote, over tasks with both. `debt` SHALL be the count of baseline entries plus the current `uncovered`, `scenario-untested`, `done-without-evidence`, `manual-evidence`, `task-without-verify`, and `weak-verify` findings not in the baseline.

Refs: REQ-ADOPT-005

#### Scenario: SCN-STAT-004-1 Median
- **WHEN** three tasks took 120, 300, and 900 seconds
- **THEN** `cycle_time_median_s` is 300

#### Scenario: SCN-STAT-004-2 Debt
- **WHEN** the baseline has 19 entries and strict check finds 2 new `uncovered`
- **THEN** `debt` is 21

#### Scenario: SCN-STAT-004-3 Verify debt
- **WHEN** the baseline is empty and strict check finds one `task-without-verify` and one `weak-verify` on tasks of change `002-ids`
- **THEN** the total `debt` is 2 and the `debt` of the `002-ids` row is 2
