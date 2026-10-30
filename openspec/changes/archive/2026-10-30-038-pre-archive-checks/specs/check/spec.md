## ADDED Requirements

### Requirement: REQ-CHK-008 Delta scenarios need a test before archive
`check --strict` SHALL report `scenario-untested` for a scenario in an ADDED or MODIFIED block of an active change. This holds only when the change has a task and no task is open. The rule SHALL use the test that main-spec scenarios use. The hint SHALL name the `// Covers: <SCN>` tag.

Refs: REQ-CHK-002, REQ-CHK-006

#### Scenario: SCN-CHK-008-1 Open task
- **WHEN** an active change holds a delta scenario with no test and one task is open
- **THEN** `check --strict` reports no `scenario-untested` for it

#### Scenario: SCN-CHK-008-2 All tasks done
- **WHEN** no task of the change is open and the change has a task and a delta scenario has no test
- **THEN** `check --strict` reports `scenario-untested` for it and the hint names the `// Covers: <SCN>` tag

#### Scenario: SCN-CHK-008-3 Tested scenario
- **WHEN** no task of the change is open and the change has a task and a test names the delta scenario
- **THEN** `check --strict` reports no `scenario-untested` for it
