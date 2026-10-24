# Spec Delta

## Purpose
Lets users take their data out of the tool in a portable CSV format.

## ADDED Requirements

### Requirement: REQ-EXP-001 CSV export
The tool SHALL write all user data to one CSV file.

Refs: REQ-EXP-002

#### Scenario: SCN-EXP-001-1 Export file
- **WHEN** the user runs export
- **THEN** the tool writes `export.csv`

### Requirement: REQ-EXP-002 Quoting
The tool SHALL quote every field that holds a comma.

#### Scenario: SCN-EXP-002-1 Comma in a field
- **WHEN** a field holds `a,b`
- **THEN** the CSV holds `"a,b"`
