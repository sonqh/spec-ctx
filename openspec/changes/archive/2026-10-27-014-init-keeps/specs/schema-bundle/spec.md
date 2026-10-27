# schema-bundle (delta)

## MODIFIED Requirements

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
