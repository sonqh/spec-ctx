# index (delta)

## ADDED Requirements

### Requirement: REQ-IDX-005 Change key
Every change folder SHALL have a key. When the folder name matches `^(\d+)-`, the key SHALL be the digits. Otherwise the key SHALL be the full folder name. Task IDs SHALL be `<key>/<group>.<n>` and design decision IDs `<key>/D<n>`. Every command and flag that accepts a key SHALL also accept the full folder name and resolve it to the same entries.

Refs: ADR-002

#### Scenario: SCN-IDX-005-1 Numbered folder
- **WHEN** the change folder is `003-distribution`
- **THEN** task 3.3 has the ID `003/3.3`

#### Scenario: SCN-IDX-005-2 Kebab-case folder
- **WHEN** the change folder is `add-mfa`
- **THEN** task 1.1 has the ID `add-mfa/1.1`

#### Scenario: SCN-IDX-005-3 Full name as alias
- **WHEN** `specctx task start 003-distribution/3.3` runs
- **THEN** it starts the task `003/3.3`

#### Scenario: SCN-IDX-005-4 Two kebab-case changes
- **WHEN** `add-mfa` and `add-sso` are both active and each has task 1.1
- **THEN** the index holds `add-mfa/1.1` and `add-sso/1.1` and `task done add-sso/1.1` closes the second one
