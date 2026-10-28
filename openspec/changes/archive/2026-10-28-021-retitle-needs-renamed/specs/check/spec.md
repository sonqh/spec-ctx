# check (delta)

## MODIFIED Requirements

### Requirement: REQ-CHK-001 Base rules
`specctx check` SHALL report: `missing-id`, `scenario-id-mismatch`, `bad-ref`, `task-without-req`, `task-without-verify`, `duplicate-id`, `reused-id` (the first ID of a retired row), `dangling-ref`, `req-without-scn`, `code-tag-no-canonical`, `unknown-cap`, `retitle-needs-renamed` (a delta ID in main with another title and no RENAMED TO line). `missing-id` and `req-without-scn` skip archived entries. A finding prints `file:line  rule  id`. Exit 1 on a finding, else `0 findings`.

Refs: ADR-002

#### Scenario: SCN-CHK-001-1 Dangling ref
- **WHEN** a spec says `Refs: REQ-NOPE-001`
- **THEN** `check` exits 1 and prints the file, line, and `dangling-ref REQ-NOPE-001`

#### Scenario: SCN-CHK-001-2 Modified is not duplicate
- **WHEN** an active change holds a MODIFIED block for an ID that also exists in `openspec/specs/`
- **THEN** `check` reports no `duplicate-id` for it

#### Scenario: SCN-CHK-001-3 Unknown capability code
- **WHEN** a spec defines `REQ-ZZZ-001` and `ZZZ` is not in config
- **THEN** `check` reports `unknown-cap REQ-ZZZ-001`

#### Scenario: SCN-CHK-001-4 Replacement ID in a retire reason
- **WHEN** a retired row reads `| REQ-CTX-008 | 2026-10-24 | moved to spec-ctx REQ-CLI-001 |`
- **THEN** `check` reports no `reused-id` for `REQ-CLI-001`

#### Scenario: SCN-CHK-001-5 Archived REMOVED block
- **WHEN** an archived change holds a `## REMOVED` block whose requirement has no scenario
- **THEN** `check` reports no `req-without-scn` for it

#### Scenario: SCN-CHK-001-6 Archived header without an ID
- **WHEN** an archived change holds `### Requirement: Old header` and `#### Scenario: Old case` with no ID
- **THEN** `check` reports no `missing-id` for either line and `adopt --dry-run` does not list them

#### Scenario: SCN-CHK-001-7 Retitle needs a RENAMED pair
- **WHEN** the no-ID fixture after `adopt` changes the MODIFIED header `REQ-UA-001 Session timeout` to `REQ-UA-001 Idle timeout`
- **THEN** `check` prints `openspec/changes/add-mfa/specs/user-auth/spec.md:<line>  retitle-needs-renamed  REQ-UA-001  "Session timeout" -> "Idle timeout"` and the hint with the RENAMED block, and after a RENAMED pair whose TO line reads `### Requirement: REQ-UA-001 Idle timeout` it prints `0 findings`
