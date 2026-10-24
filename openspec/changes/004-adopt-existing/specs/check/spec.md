# check

## MODIFIED Requirements

### Requirement: REQ-CHK-002 Strict rules
`specctx check --strict` SHALL add three rules. `unknown-task-req`: a task cites an ID that does not exist. `uncovered`: a canonical active REQ with no `Covers:` test. `scenario-untested`: a scenario ID that no test file names.

#### Scenario: SCN-CHK-002-1 Uncovered
- **WHEN** REQ-X-003 is in main specs and no test has `Covers: REQ-X-003`
- **THEN** `check --strict` exits 1 and prints `uncovered REQ-X-003`

#### Scenario: SCN-CHK-002-2 Parity
- **WHEN** both engines run `check --strict` on the parity fixture with planted findings
- **THEN** the finding lists are identical

#### Scenario: SCN-CHK-002-4 Baselined findings are counted
- **WHEN** the baseline holds three entries that still fire
- **THEN** `check --strict` prints `baselined: 3` and exits 0 for a tree that is otherwise clean
