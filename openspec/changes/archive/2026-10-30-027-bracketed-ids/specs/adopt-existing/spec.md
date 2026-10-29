# adopt-existing (delta)

## ADDED Requirements

### Requirement: REQ-ADOPT-010 Bracketed headers from adopt
`[ids] brackets` in `spec-ctx.toml` SHALL be a boolean with the default false. When it is true, `adopt` SHALL write `[REQ-...]` and `[SCN-...]` into the headers it edits, and `adopt --dry-run` SHALL print that form. When it is false, `adopt` writes the bare form. `adopt` SHALL never rewrite a header that has an ID in either form, so REQ-ADOPT-003 holds.

Refs: REQ-ADOPT-003, REQ-IDX-006

#### Scenario: SCN-ADOPT-010-1 Default writes the bare form
- **WHEN** `adopt` runs on the no-ID fixture without the `brackets` key
- **THEN** the main header reads `### Requirement: REQ-UA-001 Session timeout`

#### Scenario: SCN-ADOPT-010-2 True writes the bracketed form
- **WHEN** `adopt --dry-run` and then `adopt` run on the no-ID fixture with `brackets = true`
- **THEN** both print or write `### Requirement: [REQ-UA-001] Session timeout` and `check` adds no finding

#### Scenario: SCN-ADOPT-010-3 Second run on a bare tree
- **WHEN** `adopt` ran with the default, then `brackets` becomes true and `adopt` runs again
- **THEN** it prints `nothing to adopt` and no file changes

#### Scenario: SCN-ADOPT-010-4 Retitle of a bracketed header
- **WHEN** a bracketed MODIFIED header changes its title and the delta has no RENAMED pair
- **THEN** `check` reports `retitle-needs-renamed` with the hint, and a bracketed RENAMED pair clears it
