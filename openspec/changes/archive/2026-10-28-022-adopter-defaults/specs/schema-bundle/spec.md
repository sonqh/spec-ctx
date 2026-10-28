# schema-bundle (delta)

## MODIFIED Requirements

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
