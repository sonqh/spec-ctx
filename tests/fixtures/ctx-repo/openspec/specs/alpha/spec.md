# alpha

## Requirements

### Requirement: REQ-AAA-001 Lockfile writer
The tool SHALL write a lockfile.

Refs: ADR-001

#### Scenario: SCN-AAA-001-1 Write
- **WHEN** apply runs
- **THEN** the lockfile exists

### Requirement: REQ-AAA-002 Lockfile reader
The tool SHALL read the lockfile.

Refs: REQ-AAA-001

#### Scenario: SCN-AAA-002-1 Read
- **WHEN** status runs
- **THEN** the lockfile is read
