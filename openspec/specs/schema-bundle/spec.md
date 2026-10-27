# schema-bundle Specification

## Purpose
An OpenSpec schema whose artifacts carry stable IDs and runnable Verify clauses.

## Requirements

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
- **THEN** every REQ ID from the change exists once in `openspec/specs/` and `check --strict` prints `0 findings`

### Requirement: REQ-SCH-003 Project rules
The bundle SHALL ship an `openspec/config.yaml` fragment with the `rules` and `operations` text this repo uses, so `init --schema` can merge it into the project's config without overwriting other keys. Every list item under `rules.*` and `operations.*.guidance` SHALL parse as a YAML string. `init --schema` SHALL repair an item in the project config that parsed as a one key mapping into the string `<key>: <value>`.

#### Scenario: SCN-SCH-003-1 Merge keeps keys
- **WHEN** the project config already has a `context` key
- **THEN** `init --schema` adds `rules` and `operations` and leaves `context` unchanged

#### Scenario: SCN-SCH-003-2 Items are strings
- **WHEN** the test parses `config-fragment.yaml`
- **THEN** every item under `rules.*` and `operations.*.guidance` is a string

#### Scenario: SCN-SCH-003-3 Repair
- **WHEN** the project config holds a rule item that YAML reads as a mapping
- **THEN** after `init --schema` the item is one string and `openspec validate --all` prints no `must be an array of strings` warning

#### Scenario: SCN-SCH-003-4 Repair in an adopted project
- **WHEN** `spec-ctx.toml` exists, the config holds a rule item that YAML reads as a mapping, and `init --schema` runs without `--force`
- **THEN** it exits 0, the item is one string, and `spec-ctx.toml` keeps its bytes

### Requirement: REQ-SCH-004 Install paths in the bundle README
`schemas/spec-driven-ids/README.md` SHALL describe the copy install first: clone, copy the folder into `openspec/schemas/spec-driven-ids/`, set `schema`, merge the fragment. Then the `npx -y spec-ctx init --schema` path. It SHALL name the OpenSpec version the bundle was forked from.

#### Scenario: SCN-SCH-004-1 Both paths
- **WHEN** the test reads the README
- **THEN** a heading that contains `copy` comes before one that contains `init --schema`, and the text names `1.14.3`
