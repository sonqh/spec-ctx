# schema-bundle

## Purpose

An OpenSpec schema whose artifacts carry stable IDs and runnable Verify clauses.

## ADDED Requirements

### Requirement: REQ-SCH-001 Fork with IDs
`schemas/spec-driven-ids/` SHALL be a fork of OpenSpec `spec-driven`. Its `spec.md`, `design.md`, and `tasks.md` templates SHALL carry ID placeholders. Its artifact instructions SHALL tell the agent to allocate IDs with `specctx id new`, add `Refs:` lines, and write `Verify:` as a code span. `openspec schema validate spec-driven-ids` SHALL pass.

Refs: ADR-002

#### Scenario: SCN-SCH-001-1 Validates
- **WHEN** the bundle is copied into `openspec/schemas/` of a fresh project
- **THEN** `openspec schema validate spec-driven-ids` exits 0

#### Scenario: SCN-SCH-001-2 Placeholder caught
- **WHEN** a spec keeps the literal `REQ-<CAP>-NNN`
- **THEN** `specctx check` reports `missing-id` for that header

### Requirement: REQ-SCH-002 Archive compatible
A change written with the bundle SHALL archive with `openspec archive` and the IDs SHALL survive into `openspec/specs/`. After archive `specctx check --strict` SHALL pass on the fixture project.

#### Scenario: SCN-SCH-002-1 Round trip
- **WHEN** the fixture change is archived
- **THEN** every REQ ID from the change exists once in `openspec/specs/` and `check --strict` prints `0 finding(s)`

### Requirement: REQ-SCH-003 Project rules
The bundle SHALL ship an `openspec/config.yaml` fragment with the `rules` and `operations` text this repo uses, so `init --schema` can merge it into the project's config without overwriting other keys.

#### Scenario: SCN-SCH-003-1 Merge keeps keys
- **WHEN** the project config already has a `context` key
- **THEN** `init --schema` adds `rules` and `operations` and leaves `context` unchanged
