# apply-pipeline Specification

## Purpose
Defines how rendered artifacts reach the disk: plan first, diff the user can read, write with backups, record a lockfile, and revert on request.

## Requirements

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

### Requirement: REQ-APPLY-003 Write modes
`apply` SHALL honor each artifact's `write` mode: `replace` overwrites, `managed-block` replaces only the delimited region, `merge-json` deep-merges owned keys, `merge-toml` merges owned tables, `symlink` and `hardlink` create links. A mode the adapter did not declare SHALL be an error.

Refs: REQ-ADPT-004

#### Scenario: SCN-APPLY-003-1 Managed block inserted at end
- **WHEN** the file exists without a block
- **THEN** the block is appended after a blank line

#### Scenario: SCN-APPLY-003-2 Hardlink on Cursor
- **WHEN** an artifact has `write: hardlink` and the source exists
- **THEN** the target shares the inode of the source

### Requirement: REQ-APPLY-004 Confirmation and --yes
`apply` SHALL print the plan and ask for confirmation before writing. `--yes` SHALL skip the question. When stdin is not a TTY and `--yes` is absent, `apply` SHALL exit 3 without writing.

#### Scenario: SCN-APPLY-004-1 Non-interactive without --yes
- **WHEN** `apply` runs in CI with no TTY
- **THEN** it exits 3 and prints the plan

### Requirement: REQ-APPLY-005 Lockfile
After a successful apply, agentrc SHALL write `$AGENTRC_HOME/agentrc.lock`. The lockfile SHALL hold the profile digest, every catalog item digest, every artifact path with its content digest, the adapter versions, and the agentrc version. `status` SHALL compare the lockfile with disk.

Refs: ADR-004

#### Scenario: SCN-APPLY-005-1 Drift detected
- **WHEN** a user edits a managed block by hand after apply
- **THEN** `status` reports that artifact as `drifted` with the path

### Requirement: REQ-APPLY-006 Backups
Before overwriting or modifying a file, `apply` SHALL copy it to `$AGENTRC_HOME/backups/<timestamp>/<relative path>`. `apply` SHALL keep the last 10 backup sets and delete older ones.

#### Scenario: SCN-APPLY-006-1 Backup exists
- **WHEN** apply modifies `~/.claude/settings.json`
- **THEN** a copy of the previous content exists under `backups/<timestamp>/.claude/settings.json`

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

### Requirement: REQ-APPLY-008 Atomic per file
Each file write SHALL go through a temp file in the same directory followed by rename. A failure mid-apply SHALL leave already-written files in place and print which artifacts were not written.

#### Scenario: SCN-APPLY-008-1 Failure on third artifact
- **WHEN** writing the third artifact fails with EACCES
- **THEN** the first two are on disk, the lockfile is not written, and the error names the third path

### Requirement: REQ-APPLY-009 Never touch secrets
`apply` SHALL refuse to write any path matching `auth.json`, `credentials*`, `*.token`, `.env` under an agent config directory, and SHALL never read them.

#### Scenario: SCN-APPLY-009-1 Adapter bug
- **WHEN** an adapter returns an artifact at `~/.codex/auth.json`
- **THEN** apply aborts before writing anything and names the path

### Requirement: REQ-APPLY-010 Apply outro
After a successful apply, `apply` SHALL print: the count of files written, the backup set id, and two lines `Check: agentrc status` and `Undo: agentrc revert`. With `--json` these SHALL be fields, not lines.

#### Scenario: SCN-APPLY-010-1 Outro lines
- **WHEN** `apply --yes` writes three files
- **THEN** stdout ends with the count, the backup id, `Check: agentrc status` and `Undo: agentrc revert`
