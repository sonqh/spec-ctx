## ADDED Requirements

### Requirement: REQ-DIST-014 Plain descriptions in action.yml
No `description` value in `action.yml` SHALL hold `${{`, quoted or not. A `description` that holds `: ` SHALL be a quoted YAML string. `tests/action/selftest.sh` SHALL fail on a violation. A plain scalar with `: ` is not valid YAML, and the runner may evaluate an expression.

Refs: REQ-DIST-005, REQ-DIST-010

#### Scenario: SCN-DIST-014-1 Action file is clean
- **WHEN** the check runs on `action.yml`
- **THEN** no `description` holds `${{`, every `description` with `: ` has quotes, and the check exits 0

#### Scenario: SCN-DIST-014-2 Plain scalar fails
- **WHEN** the check runs on a copy where a `description` is `pass base: x` without quotes
- **THEN** it exits 1 and names the line

#### Scenario: SCN-DIST-014-3 Expression fails
- **WHEN** the check runs on a copy where a quoted `description` holds `${{ github.event.before }}`
- **THEN** it exits 1 and names the line
