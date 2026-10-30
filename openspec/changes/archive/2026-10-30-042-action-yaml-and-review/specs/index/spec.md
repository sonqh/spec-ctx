## ADDED Requirements

### Requirement: REQ-IDX-007 Covers tag reads the whole line
After `Covers:` in a test file, `specctx build` SHALL read the rest of the line. It SHALL record every REQ ID on it, with a word boundary on both sides. Spaces, commas, and `;` separate IDs. An SCN ID on the line SHALL not hide a REQ ID. `REQ-AB-0011` SHALL not match `REQ-AB-001`.

Refs: REQ-IDX-001

#### Scenario: SCN-IDX-007-1 Mixed IDs and separators
- **WHEN** a test line is `Covers: SCN-AB-001-1, REQ-AB-001 REQ-AB-002; REQ-AB-003`
- **THEN** the index records test entries for REQ-AB-001, REQ-AB-002, and REQ-AB-003

#### Scenario: SCN-IDX-007-2 SCN first
- **WHEN** a test line starts the list with an SCN ID and then names a REQ ID
- **THEN** the REQ ID gets a test entry and `check --strict` reports no `uncovered` for it

#### Scenario: SCN-IDX-007-3 Four digit suffix
- **WHEN** a test line is `Covers: REQ-AB-0011`
- **THEN** the index records no test entry for REQ-AB-001
