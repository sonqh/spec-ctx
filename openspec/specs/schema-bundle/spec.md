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
The bundle SHALL ship an `openspec/config.yaml` fragment with the `rules` and `operations` of this repo. `init --schema` SHALL merge it into the project config, keep other keys, and merge list items one by one into an existing key with no duplicate. Every item under `rules.*` and `operations.*.guidance` SHALL parse as a YAML string. `init --schema` SHALL repair an item that parsed as a mapping into one string. After the schema step, `init` SHALL print one `templates:` line.

Refs: ADR-006

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

#### Scenario: SCN-SCH-003-5 Templates line
- **WHEN** `init --all` runs on a fresh `openspec init` project
- **THEN** the output has one line `templates: openspec/schemas/spec-driven-ids/templates/ (spec.md, tasks.md hold the ID placeholders)` before the `next:` line, and `init --skills` prints no `templates:` line

#### Scenario: SCN-SCH-003-6 Merge items into an existing key
- **WHEN** the project config has a `rules` key with two `specs` items, one of them equal to a fragment item
- **THEN** `init --schema` keeps both, adds every other fragment item of `rules.specs` after them, adds the other `rules` lists, prints `merged openspec/config.yaml rules (<n> added)`, and a second run adds nothing

### Requirement: REQ-SCH-004 Install paths in the bundle README
`schemas/spec-driven-ids/README.md` SHALL describe the copy install first: clone, copy the folder into `openspec/schemas/spec-driven-ids/`, set `schema`, merge the fragment. Then the `npx -y spec-ctx init --schema` path. It SHALL name the OpenSpec version the bundle was forked from.

#### Scenario: SCN-SCH-004-1 Both paths
- **WHEN** the test reads the README
- **THEN** a heading that contains `copy` comes before one that contains `init --schema`, and the text names `1.14.3`

### Requirement: REQ-SCH-005 Rules reach the stock schema
The `rules` and `operations` that `init --schema` merges into `openspec/config.yaml` SHALL reach the artifact instructions of the stock `spec-driven` schema. `tests/paths/rules-only.sh` SHALL prove it on upstream OpenSpec, so the schema copy can go in a later change.

Refs: ADR-006, REQ-SCH-003

#### Scenario: SCN-SCH-005-1 Rules only
- **WHEN** `openspec init` and `specctx init --schema` ran, `openspec/config.yaml` says `schema: spec-driven` again, and `openspec instructions specs --change <c> --json` runs
- **THEN** the `rules` list of the output and the plain text output both hold `specctx id new`
