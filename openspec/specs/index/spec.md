# index Specification

## Purpose
The index is the single source every other command reads. It records every ID in the project, where it lives, which copy is canonical, and what links it has.

## Requirements

### Requirement: REQ-IDX-001 Index sources
`specctx build` SHALL scan the paths listed in `spec-ctx.toml` under `[scan]`: `specs`, `changes`, `decisions`, `code`, `tests`. Defaults: `openspec/specs/**/*.md`, `openspec/changes/**/*.md`, `decisions/*.md`, `src/**`, `tests/**`. It SHALL skip `node_modules/**`, `.git/**`, and the `ignore` globs from config. It SHALL extract every ID that matches ADR-002, every `Refs:` line, every design decision bullet, and write `.ctx/index.json`.

Refs: ADR-002

#### Scenario: SCN-IDX-001-1 Clean build
- **WHEN** `specctx build` runs on the parity fixture
- **THEN** `.ctx/index.json` exists and holds every REQ, SCN, ADR, task, and decision ID present in the files

#### Scenario: SCN-IDX-001-2 Code and test tags
- **WHEN** `src/a.ts` has `// REQ-IDX-002` and `tests/a.test.ts` has `// Covers: REQ-IDX-002`
- **THEN** the index records `src/a.ts` as `code` for REQ-IDX-002 and `tests/a.test.ts` as `test` for it

#### Scenario: SCN-IDX-001-3 Ignore globs
- **WHEN** config lists `tests/fixtures/**` under `ignore`
- **THEN** no entry has a `file` under `tests/fixtures/`

### Requirement: REQ-IDX-002 Record shape
Each entry SHALL have `id`, `kind` (`req`, `scn`, `adr`, `decision`, `task`, `code`, `test`), `file`, `line`, `title`, `text`, `change`, `status`, `canonical`, `refs`. `status` SHALL be one of `active`, `modified`, `removed`, `archived`, `done`, `open`. `text` SHALL hold the lower-cased body for req, scn, and decision and be empty otherwise. The file SHALL be JSON sorted by `id` then `file`, two-space indent, trailing newline, with a `scanned` record (`count`, `newest_mtime_ms`).

#### Scenario: SCN-IDX-002-1 Deterministic output
- **WHEN** `specctx build` runs twice without file changes
- **THEN** `.ctx/index.json` is byte-identical

#### Scenario: SCN-IDX-002-2 Text field
- **WHEN** a requirement body contains `push to main`
- **THEN** its entry's `text` contains `push to main`

#### Scenario: SCN-IDX-002-3 Parity with the Python engine
- **WHEN** both engines build the parity fixture
- **THEN** the two index files are byte-identical

### Requirement: REQ-IDX-003 One canonical entry per ID
For each REQ, SCN, and ADR ID the index SHALL mark exactly one entry `canonical: true`. Order: an active change (ADDED or MODIFIED block), then `openspec/specs/`, then `openspec/changes/archive/`. An entry under a `## MODIFIED` header SHALL have `status: modified`. An entry under `## REMOVED` SHALL have `status: removed` and never be canonical. Decisions SHALL be canonical in the change that holds them.

Refs: ADR-002

#### Scenario: SCN-IDX-003-1 Main wins over archive
- **WHEN** an ID exists in `openspec/specs/` and in an archive and in no active change
- **THEN** only the `openspec/specs/` entry is canonical

#### Scenario: SCN-IDX-003-2 Pending change wins over main
- **WHEN** an active change has the ID under `## MODIFIED Requirements`
- **THEN** that entry is canonical with `status: modified`

#### Scenario: SCN-IDX-003-3 Count
- **WHEN** `specctx build` runs
- **THEN** the count of canonical REQ entries equals the count of distinct REQ IDs

### Requirement: REQ-IDX-004 Stale detection and speed
Every command except `build` SHALL compare the `scanned` record with a fresh stat walk of the scan paths. On a mismatch or a missing index it SHALL rebuild, print `index rebuilt` on stderr, then answer. The walk SHALL not read file contents. `build` SHALL finish under 1 s on a fixture of 2,000 files on Node 22.

Refs: ADR-003

#### Scenario: SCN-IDX-004-1 Edited spec
- **WHEN** a spec file changes after `build` and `specctx query x` runs
- **THEN** stderr contains `index rebuilt` and the answer reflects the edit

#### Scenario: SCN-IDX-004-2 Fresh index is silent
- **WHEN** nothing changed since `build`
- **THEN** `specctx query x` prints nothing on stderr

#### Scenario: SCN-IDX-004-3 Speed
- **WHEN** `specctx build` runs on the 2,000 file perf fixture with Node 22
- **THEN** wall time is under 1 s

### Requirement: REQ-IDX-005 Change key
Every change folder SHALL have a key. When the folder name matches `^(\d+)-`, the key SHALL be the digits. Otherwise the key SHALL be the full folder name. Task IDs SHALL be `<key>/<group>.<n>` and design decision IDs `<key>/D<n>`. Every command and flag that accepts a key SHALL also accept the full folder name and resolve it to the same entries.

Refs: ADR-002

#### Scenario: SCN-IDX-005-1 Numbered folder
- **WHEN** the change folder is `003-distribution`
- **THEN** task 3.3 has the ID `003/3.3`

#### Scenario: SCN-IDX-005-2 Kebab-case folder
- **WHEN** the change folder is `add-mfa`
- **THEN** task 1.1 has the ID `add-mfa/1.1`

#### Scenario: SCN-IDX-005-3 Full name as alias
- **WHEN** `specctx task start 003-distribution/3.3` runs
- **THEN** it starts the task `003/3.3`

#### Scenario: SCN-IDX-005-4 Two kebab-case changes
- **WHEN** `add-mfa` and `add-sso` are both active and each has task 1.1
- **THEN** the index holds `add-mfa/1.1` and `add-sso/1.1` and `task done add-sso/1.1` closes the second one
