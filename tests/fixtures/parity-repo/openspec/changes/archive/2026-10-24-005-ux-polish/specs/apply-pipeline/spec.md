# apply-pipeline

## MODIFIED Requirements

### Requirement: REQ-APPLY-001 Plan is read-only
`plan` SHALL compile, render for every enabled and installed agent, read current disk state, and print one line per artifact with one of `create`, `update`, `unchanged`, `skip`, `remove`. `remove` SHALL apply to an owned artifact the last apply wrote that the profile no longer renders. `plan` SHALL write nothing.

Refs: ADR-002, REQ-ADPT-006, REQ-APPLY-005

#### Scenario: SCN-APPLY-001-1 Nothing on disk
- **WHEN** no agent config exists
- **THEN** every artifact is listed as `create` and the filesystem is unchanged after plan

#### Scenario: SCN-APPLY-001-2 Dropped language
- **WHEN** the last apply wrote `rules/lang-python.md` and the profile no longer lists python
- **THEN** `plan` lists `rules/lang-python.md` as `remove`

### Requirement: REQ-APPLY-002 Diff
`plan --diff`, `apply --diff` and `init --diff` SHALL print a unified diff per artifact that would change. Without `--diff` they SHALL print the summary line from REQ-CLI-008. For managed blocks the diff SHALL cover the whole file. For merge-json and merge-toml the diff SHALL show the serialized result against the current file.

Refs: ADR-003, REQ-CLI-008

#### Scenario: SCN-APPLY-002-1 Diff of a managed block
- **WHEN** only the block content changes in `CLAUDE.md`
- **THEN** the diff shows the changed block lines with three lines of context and no changes outside the block

#### Scenario: SCN-APPLY-002-2 No diff by default
- **WHEN** `apply --yes` runs without `--diff`
- **THEN** no line starts with `@@`

### Requirement: REQ-APPLY-007 Revert
`revert [--to <timestamp>]` SHALL restore every file in the chosen backup set (default: latest) and remove owned artifacts created in that apply. It SHALL print each restored or removed path. It SHALL end with one line that says whether `status` will now report drift and why. `revert --list` SHALL print the available backup sets, newest first, with their file counts.

#### Scenario: SCN-APPLY-007-1 Full revert
- **WHEN** `revert` runs after one apply on an empty home
- **THEN** no agentrc artifact remains and the lockfile is removed

#### Scenario: SCN-APPLY-007-2 Revert explains drift
- **WHEN** `revert` restores a file whose content differs from the restored lockfile
- **THEN** the last line says `status` will report drift for that path and names `agentrc apply` as the way to re-sync

#### Scenario: SCN-APPLY-007-3 List
- **WHEN** `revert --list` runs after two applies
- **THEN** two timestamps print, newest first, each with a file count

## ADDED Requirements

### Requirement: REQ-APPLY-010 Apply outro
After a successful apply, `apply` SHALL print: the count of files written, the backup set id, and two lines `Check: agentrc status` and `Undo: agentrc revert`. With `--json` these SHALL be fields, not lines.

#### Scenario: SCN-APPLY-010-1 Outro lines
- **WHEN** `apply --yes` writes three files
- **THEN** stdout ends with the count, the backup id, `Check: agentrc status` and `Undo: agentrc revert`
