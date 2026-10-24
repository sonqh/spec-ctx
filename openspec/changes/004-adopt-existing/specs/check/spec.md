# check

## MODIFIED Requirements

### Requirement: REQ-CHK-002 Strict rules
`specctx check --strict` SHALL add three rules. `unknown-task-req`: a task cites an ID that does not exist. `uncovered`: a canonical active REQ with no `Covers:` test. `scenario-untested`: a scenario ID that no test file names. An ID that a `## REMOVED` block of an active change names SHALL be exempt from `uncovered` and `scenario-untested`, because its removal is pending archive. A finding listed in `.ctx/baseline.json` SHALL be dropped from the output, in strict and non-strict mode, and counted in a final line `baselined: <n>`.

#### Scenario: SCN-CHK-002-3 Pending removal is exempt
- **WHEN** an active change has `REQ-OLD-001` under `## REMOVED Requirements` and no test covers it
- **THEN** `check --strict` reports no `uncovered` and no `scenario-untested` for `REQ-OLD-001` or its scenarios

#### Scenario: SCN-CHK-002-1 Uncovered
- **WHEN** REQ-XX-003 is in main specs and no test has `Covers: REQ-XX-003`
- **THEN** `check --strict` exits 1 and prints `uncovered REQ-XX-003`

#### Scenario: SCN-CHK-002-2 Parity
- **WHEN** both engines run `check --strict` on the parity fixture with planted findings
- **THEN** the finding lists are identical

#### Scenario: SCN-CHK-002-4 Baselined findings are counted
- **WHEN** the baseline holds three entries that still fire
- **THEN** `check --strict` prints `baselined: 3` and exits 0 for a tree that is otherwise clean
