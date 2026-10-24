# profile-schema

## ADDED Requirements

### Requirement: REQ-PROF-012 Generated profile has comments
The `profile.yaml` written by `elicit` SHALL carry a YAML comment above each enum field that lists the allowed values. Above `extensions` it SHALL carry a comment with one example per source form. The comments SHALL survive a `validate` and a reload.

Refs: REQ-CAT-001

#### Scenario: SCN-PROF-012-1 Enum comment
- **WHEN** `elicit` writes a profile
- **THEN** the line above `verbosity:` is a comment that contains `terse, normal, explanatory`

#### Scenario: SCN-PROF-012-2 Extensions example
- **WHEN** `elicit` writes a profile
- **THEN** a comment above `extensions:` contains `skills/` and `cct/`

### Requirement: REQ-PROF-013 Reference errors show an example
A validation error on a catalog reference SHALL include the line `example: skills/<owner>/<name> or cct/<path>`.

Refs: REQ-PROF-011, REQ-CAT-001

#### Scenario: SCN-PROF-013-1 Bad source
- **WHEN** `extensions.skills` contains `github:sonqh/x`
- **THEN** the error names the entry and contains `example: skills/<owner>/<name>`
