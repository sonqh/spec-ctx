## ADDED Requirements

### Requirement: REQ-CHK-010 Deferred coverage notice
`check --strict` SHALL print a `deferred:` line for each active change that has no task or an open task, and a delta requirement or scenario without a test. It SHALL not print the line for a change with no such item. `--strict --json` SHALL always hold a `deferred` array. The line SHALL write `item` and `task` in the singular for a count of 1. A line SHALL not change the exit code. `gate` SHALL not print it.

Refs: REQ-CHK-008, REQ-CHK-009, REQ-CHK-004

#### Scenario: SCN-CHK-010-1 Open task
- **WHEN** an active change has one open task and a delta requirement with no `Covers:` tag
- **THEN** `check --strict` prints `deferred: <change>  <n> untested delta items, <k> open tasks` with the counts of that change, and `item` or `task` in the singular for a count of 1
- **AND** the exit code is the same as without the line

#### Scenario: SCN-CHK-010-2 All tasks done
- **WHEN** an active change has a task and no open task
- **THEN** `check --strict` prints no `deferred:` line for it

#### Scenario: SCN-CHK-010-3 Nothing deferred
- **WHEN** an active change has an open task and every delta requirement and scenario has a test
- **THEN** `check --strict` prints no `deferred:` line for it

#### Scenario: SCN-CHK-010-4 JSON
- **WHEN** `check --strict --json` runs and one change defers items
- **THEN** the output holds `deferred` with one object `{change, untested, open}` for it
- **AND** with nothing deferred, `check --strict --json` holds `deferred: []`
- **AND** `check --json` without `--strict` has no `deferred` key

#### Scenario: SCN-CHK-010-5 Line order
- **WHEN** `check --strict` prints `deferred:` and `baselined:` lines
- **THEN** the `deferred:` lines come first and the `baselined:` line stays last

#### Scenario: SCN-CHK-010-7 No task
- **WHEN** an active change holds a delta requirement with no `Covers:` tag and has no task
- **THEN** `check --strict` prints `deferred: <change>  1 untested delta item, 0 open tasks`

#### Scenario: SCN-CHK-010-6 Gate
- **WHEN** `gate --strict` fails at its check step and a change defers items
- **THEN** the gate output holds no `deferred:` line and the gate exit code is the same as without the deferral

#### Scenario: SCN-CHK-010-8 Singular
- **WHEN** an active change has one open task and one untested delta item
- **THEN** `check --strict` prints `deferred: <change>  1 untested delta item, 1 open task`

## MODIFIED Requirements

### Requirement: REQ-CHK-004 Duplicate change key and summary
`check` SHALL report `duplicate-change-key` as a hard finding when two change folders, active or archived, resolve to one key. Human output SHALL end with one summary line `<n> findings in <m> files (<h> hard, <a> advisory)` and one line per rule present: `<rule>  <count>  <hint>`. Only `deferred:` lines (REQ-CHK-010) and the `baselined:` line SHALL follow. Hints SHALL live in one table beside the rule definitions. `--json` SHALL not change, except for REQ-CHK-010.

Refs: REQ-IDX-005, REQ-CHK-010

#### Scenario: SCN-CHK-004-1 Duplicate key
- **WHEN** both `001-a` and `001-b` exist under `openspec/changes/`
- **THEN** `check` prints `duplicate-change-key 001` as hard and exits 1

#### Scenario: SCN-CHK-004-2 Summary line
- **WHEN** `check --strict` finds 3 `uncovered` and 1 `req-without-scn` in two files
- **THEN** the output ends with `4 findings in 2 files (4 hard, 0 advisory)` and a line for each of the two rules with its hint

#### Scenario: SCN-CHK-004-3 Clean
- **WHEN** `check` finds nothing
- **THEN** it prints `0 findings` and exits 0
