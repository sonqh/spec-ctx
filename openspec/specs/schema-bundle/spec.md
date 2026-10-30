# schema-bundle Specification

## Purpose
An OpenSpec schema whose artifacts carry stable IDs and runnable Verify clauses.

## Requirements

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

### Requirement: REQ-SCH-006 Bracketed templates
When `[ids] brackets` is true in `spec-ctx.toml`, `init --schema` SHALL install templates whose requirement and scenario header placeholders sit in square brackets. It SHALL merge `rules.specs` items whose header examples use square brackets. Task citations, `Refs:` lines, code tags, and `Covers:` tags SHALL stay bare. When the value is false or the file is absent, `init --schema` SHALL install the bytes it installs today.

Refs: REQ-SCH-003, REQ-IDX-006, REQ-IDS-004

#### Scenario: SCN-SCH-006-1 Bracketed placeholders
- **WHEN** `spec-ctx.toml` says `brackets = true` and `init --schema` runs
- **THEN** `spec.md` under `openspec/templates/spec-driven-ids/` has the header lines `### Requirement: [REQ-<CAP>-NNN]` and `#### Scenario: [SCN-<CAP>-NNN-1]`, and the task lines of `tasks.md` still cite `[REQ-<CAP>-NNN]` with one pair of brackets

#### Scenario: SCN-SCH-006-2 Bracketed rules
- **WHEN** `spec-ctx.toml` says `brackets = true` and `init --schema` runs on a config without `rules`
- **THEN** the `rules.specs` items show `### Requirement: [REQ-ABC-001] Name` and `#### Scenario: [SCN-ABC-001-1] Name`, and the `rules.tasks` item and the `operations` items are equal to the fragment

#### Scenario: SCN-SCH-006-3 Brackets off
- **WHEN** `spec-ctx.toml` says `brackets = false` or does not exist, and `init --schema` runs
- **THEN** every installed template and every merged item is byte equal to the bundle

#### Scenario: SCN-SCH-006-4 Fresh path with brackets
- **WHEN** a fresh `openspec init` project gets `spec-ctx.toml` with `brackets = true`, then `init --schema`, then one change from the templates with IDs from `id new`
- **THEN** `gate --strict` exits 0 and every requirement and scenario header of the change has its ID in square brackets

### Requirement: REQ-SCH-007 Flip the bracket form
When `init --schema` runs without `--force`, a template whose bytes equal the other bracket form SHALL get the form of the current setting. A config item whose text equals the other form of a fragment item SHALL get the text of the current form in place. A template or an item with other content SHALL stay. A second run SHALL change nothing.

Refs: REQ-SCH-006, REQ-DIST-002

#### Scenario: SCN-SCH-007-1 Unchanged template flips
- **WHEN** `init --schema` installed the bare templates, the user sets `brackets = true`, and `init --schema` runs again
- **THEN** `spec.md` holds the bracketed form, the output has a `wrote openspec/templates/spec-driven-ids/spec.md` line, and no `kept` line names it

#### Scenario: SCN-SCH-007-2 Changed template stays
- **WHEN** the user edited `spec.md` after the first install, sets `brackets = true`, and `init --schema` runs again without `--force`
- **THEN** `spec.md` keeps its bytes and the output has `kept openspec/templates/spec-driven-ids/spec.md (other content)`

#### Scenario: SCN-SCH-007-3 Config items flip
- **WHEN** the config holds the bare `rules.specs` items from a first install and `init --schema` runs again with `brackets = true`
- **THEN** each of the two header items holds the bracketed text at the same line. The config holds no bare copy of them, and the other items keep their bytes

#### Scenario: SCN-SCH-007-4 Second run
- **WHEN** `init --schema` runs a second time with the same setting after a flip
- **THEN** the first line of the output is `nothing to do` and no file changes
