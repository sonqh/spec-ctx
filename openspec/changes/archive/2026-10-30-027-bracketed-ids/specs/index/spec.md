# index (delta)

## ADDED Requirements

### Requirement: REQ-IDX-006 Bracketed IDs in headers
The scan SHALL read the ID of a requirement or scenario header in two forms: bare, `REQ-UA-001 Name`, and in square brackets, `[REQ-UA-001] Name`. This holds in main specs, deltas, and archives. Both forms SHALL give the same ID and the same title, without the brackets or the ID. A delta in one form matches a main entry in the other form by REQ-IDX-003. A bracket that holds no spec-ctx ID is not an ID.

Refs: REQ-IDX-003, ADR-002

#### Scenario: SCN-IDX-006-1 Bracketed main header
- **WHEN** a main spec has `### Requirement: [REQ-UA-001] Session timeout`
- **THEN** the index holds `REQ-UA-001` with the title `Session timeout` and no `missing-id`

#### Scenario: SCN-IDX-006-2 Bracketed delta of a bare main header
- **WHEN** main has `REQ-UA-001 Session timeout` and an active change has a MODIFIED block with `[REQ-UA-001] Session timeout`
- **THEN** the index holds one ID, `check` reports no `duplicate-id`, and the delta entry is canonical with status `modified`

#### Scenario: SCN-IDX-006-3 Bracketed scenario under a bracketed requirement
- **WHEN** `#### Scenario: [SCN-UA-001-1] Idle user` follows `### Requirement: [REQ-UA-001] Session timeout`
- **THEN** the scenario links to `REQ-UA-001` and `check` reports no `scenario-id-mismatch`

#### Scenario: SCN-IDX-006-4 Bracket without a spec-ctx ID
- **WHEN** a main spec has `### Requirement: [AUTH-3] Users sign in` or `### Requirement: [draft] Name`
- **THEN** `check` reports `missing-id` for each header
