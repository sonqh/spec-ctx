# profile-schema Specification

## Purpose
The profile file has one schema that every reader validates against.

## Requirements

### Requirement: Required name
The profile SHALL hold a non-empty `name` field.

#### Scenario: Missing name
- **WHEN** a profile has no `name`
- **THEN** validation fails and names the field

### Requirement: Unknown keys
The schema SHALL reject a key that it does not define.

#### Scenario: Extra key
- **WHEN** a profile holds the key `colour`
- **THEN** validation fails and names `colour`
