# adopt-existing (delta)

## MODIFIED Requirements

### Requirement: REQ-ADOPT-005 Baseline ratchet
`specctx baseline write` SHALL record every current finding of `uncovered`, `scenario-untested`, `done-without-evidence`, `manual-evidence`, `task-without-req`, `task-without-verify`, and `missing-id` as sorted `rule id` pairs in `.ctx/baseline.json`. A `missing-id` pair has `<file> <title>` as id. `check` and `check --strict` SHALL hide a finding in the baseline. `baseline prune` SHALL drop entries that no longer fire and print the count. No command SHALL add a single entry.

Refs: REQ-CHK-002

#### Scenario: SCN-ADOPT-005-1 Day one strict
- **WHEN** `baseline write` runs on the no-ID fixture after `adopt`
- **THEN** `check --strict` exits 0 and `.ctx/baseline.json` lists the pre-existing uncovered requirements and the legacy tasks without a REQ citation

#### Scenario: SCN-ADOPT-005-2 New debt is visible
- **WHEN** a new requirement without a test is added after the baseline
- **THEN** `check --strict` reports `uncovered` for it and for nothing in the baseline

#### Scenario: SCN-ADOPT-005-3 Prune
- **WHEN** a test gains `Covers:` for a baselined requirement and `baseline prune` runs
- **THEN** that entry is gone and the command prints `pruned 1`

#### Scenario: SCN-ADOPT-005-4 Unmatched delta headers go in the baseline
- **WHEN** an active delta holds a MODIFIED header that matches no main requirement, `adopt` leaves it without an ID, and `baseline write` runs
- **THEN** `.ctx/baseline.json` holds `missing-id <file> <title>` for that header and each of its scenarios, and `gate --strict` exits 0

#### Scenario: SCN-ADOPT-005-5 A new header without an ID still fires
- **WHEN** a main spec gains `### Requirement: Rate limit` without an ID after the baseline
- **THEN** `check` reports `missing-id` for it and for nothing in the baseline
