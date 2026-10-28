# schema-bundle (delta)

## REMOVED Requirements

### Requirement: REQ-SCH-001 Fork with IDs
**Reason**: ADR-006 item 8. The schema copy drifted on every upstream release. REQ-SCH-005 proves that the fragment `rules` reach the agent on the stock `spec-driven` schema. The templates stay under REQ-SCH-003. `check` still reports a kept placeholder as `missing-id`.
**Migration**: Set `schema: spec-driven` in `openspec/config.yaml`. Run `specctx init --schema` for the templates. Delete `openspec/schemas/spec-driven-ids/`.

## MODIFIED Requirements

### Requirement: REQ-SCH-002 Archive compatible
A change written from the bundle templates on the stock `spec-driven` schema SHALL archive with `openspec archive` and the IDs SHALL survive into `openspec/specs/`. After archive `specctx check --strict` SHALL pass on the fixture project.

#### Scenario: SCN-SCH-002-1 Round trip
- **WHEN** the fixture change is archived
- **THEN** every REQ ID from the change exists once in `openspec/specs/` and `check --strict` prints `0 findings`

### Requirement: REQ-SCH-003 Project rules
The bundle SHALL ship four templates with ID placeholders and a config fragment with `rules` and `operations`. `init --schema` SHALL install the templates into `openspec/templates/spec-driven-ids/`, merge the fragment item by item with no duplicate, keep other keys, and never write the `schema` key. Every item under `rules.*` and `operations.*.guidance` SHALL parse as a YAML string. `init --schema` SHALL repair a mapping item into one string and print one `templates:` line.

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
- **THEN** the output has one line `templates: openspec/templates/spec-driven-ids/ (spec.md, tasks.md hold the ID placeholders)` before the `next:` line, and `init --skills` prints no `templates:` line

#### Scenario: SCN-SCH-003-6 Merge items into an existing key
- **WHEN** the project config has a `rules` key with two `specs` items, one of them equal to a fragment item
- **THEN** `init --schema` keeps both, adds every other fragment item of `rules.specs` after them, adds the other `rules` lists, prints `merged openspec/config.yaml rules (<n> added)`, and a second run adds nothing

#### Scenario: SCN-SCH-003-7 Templates only, stock schema
- **WHEN** `init --all` runs on a fresh `openspec init` project
- **THEN** `openspec/templates/spec-driven-ids/` holds `proposal.md`, `design.md`, `spec.md`, and `tasks.md`, no `openspec/schemas/` folder exists, `openspec/config.yaml` still says `schema: spec-driven`, and the `apply` guidance names `specctx task done <id>` and the `specctx-run` skill

#### Scenario: SCN-SCH-003-8 Legacy schema value
- **WHEN** `openspec/config.yaml` says `schema: spec-driven-ids` and `init --schema` runs
- **THEN** the output has the line `note: schema spec-driven-ids is no longer installed. Set schema: spec-driven in openspec/config.yaml. The rules now carry the ID instructions.` and the `schema` line keeps its value
