# Spec Delta

## ADDED Requirements

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
