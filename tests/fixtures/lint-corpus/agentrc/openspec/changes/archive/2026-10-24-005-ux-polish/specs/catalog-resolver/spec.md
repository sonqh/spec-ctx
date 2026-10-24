# catalog-resolver

## ADDED Requirements

### Requirement: REQ-CAT-009 Fetch error format
A failed fetch SHALL print four labeled lines: `item:` the reference, `source:` the URL or command tried, `cause:` one sentence, `fix:` one command or action. Child process output SHALL not appear without `--verbose`. Exit codes do not change: 2 for a missing item (REQ-CAT-002), 1 for a digest mismatch (REQ-CAT-005).

Refs: REQ-CLI-004

#### Scenario: SCN-CAT-009-1 Unknown skill
- **WHEN** `resolve` cannot find `skills/sonqh/missing`
- **THEN** the output has the four labels and the `fix:` line names a way to check the reference

#### Scenario: SCN-CAT-009-2 Exit code
- **WHEN** an item is missing upstream
- **THEN** `resolve` exits 2 and prints the four labeled lines
