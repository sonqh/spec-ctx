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

### Requirement: REQ-IDX-006 Bracketed IDs in headers
The scan SHALL read the ID of a requirement or scenario header in two forms: bare, `REQ-UA-001 Name`, and in square brackets, `[REQ-UA-001] Name`. This holds in main specs, deltas, and archives. Both forms SHALL give the same ID and the same title, without the brackets or the ID. A delta in one form matches a main entry in the other form by REQ-IDX-003. A bracket that holds no spec-ctx ID is not an ID.

Refs: REQ-IDX-003, ADR-002

#### Scenario: SCN-IDX-006-1 Bracketed main header
- **WHEN** a main spec has `### Requirement: [REQ-UA-001] Session timeout`
- **THEN** the index holds `REQ-UA-001` with the title `Session timeout` and no `missing-id`

#### Scenario: SCN-IDX-006-2 Bracketed delta of a bare main header
- **WHEN** main has `REQ-UA-001 Session timeout` and an active change has a MODIFIED block with `[REQ-UA-001] Session timeout`
- **THEN** the index holds one ID, `check` reports no `duplicate-id`, and the delta entry is canonical with status `modified`

#### Scenario: SCN-IDX-006-3 Bracketed scenario under a bracketed requirement
- **WHEN** `#### Scenario: [SCN-UA-001-1] Idle user` follows `### Requirement: [REQ-UA-001] Session timeout`
- **THEN** the scenario links to `REQ-UA-001` and `check` reports no `scenario-id-mismatch`

#### Scenario: SCN-IDX-006-4 Bracket without a spec-ctx ID
- **WHEN** a main spec has `### Requirement: [AUTH-3] Users sign in` or `### Requirement: [draft] Name`
- **THEN** `check` reports `missing-id` for each header

### Requirement: REQ-IDX-007 Covers tag reads the whole line
After `Covers:` in a test file, `specctx build` SHALL read the rest of the line. It SHALL record every REQ ID on it, with a word boundary on both sides. Spaces, commas, and `;` separate IDs. An SCN ID on the line SHALL not hide a REQ ID. `REQ-AB-0011` SHALL not match `REQ-AB-001`.

Refs: REQ-IDX-001

#### Scenario: SCN-IDX-007-1 Mixed IDs and separators
- **WHEN** a test line is `Covers: SCN-AB-001-1, REQ-AB-001 REQ-AB-002; REQ-AB-003`
- **THEN** the index records test entries for REQ-AB-001, REQ-AB-002, and REQ-AB-003

#### Scenario: SCN-IDX-007-2 SCN first
- **WHEN** a test line starts the list with an SCN ID and then names a REQ ID
- **THEN** the REQ ID gets a test entry and `check --strict` reports no `uncovered` for it

#### Scenario: SCN-IDX-007-3 Four digit suffix
- **WHEN** a test line is `Covers: REQ-AB-0011`
- **THEN** the index records no test entry for REQ-AB-001

### Requirement: REQ-IDX-008 Code tag reads every REQ ID
`specctx build` SHALL record a code entry for every REQ ID on a code tag line. A tag line has a comment marker (`//`, `#`, `/*`, or `*`) and then a REQ ID. Every REQ ID after the marker counts, with a word boundary on both sides. `REQ-AB-0011` SHALL not match `REQ-AB-001`. A `Covers:` line is not a code tag.

Refs: REQ-IDX-001, REQ-IDX-007

#### Scenario: SCN-IDX-008-1 Two IDs on one line
- **WHEN** a code line is `// REQ-AB-001, REQ-AB-002 note`
- **THEN** the index records a code entry for REQ-AB-001 and one for REQ-AB-002

#### Scenario: SCN-IDX-008-2 Boundary and Covers
- **WHEN** a code line is `// REQ-AB-001 REQ-AB-0021` or a test line is `// Covers: REQ-AB-001`
- **THEN** the first line records REQ-AB-001 only, and the Covers line records no code entry

### Requirement: REQ-IDX-009 Task paths
For a task in an active change, `specctx build` SHALL record the paths that its line names in backticks. A path is a code span with no space and no `*` that holds a `/` or a `.`. `./` at the start of a path does not count. The index stores them in `paths` of the task entry and omits the key when it is empty. A task under `archive/` records none.

Refs: REQ-IDX-001

#### Scenario: SCN-IDX-009-1 Paths of an active task
- **WHEN** an active task line names `src/a.ts`, `./b.md`, `bun test`, and `src/**`
- **THEN** the task entry has `paths` equal to `src/a.ts` and `b.md`

#### Scenario: SCN-IDX-009-2 Archived task
- **WHEN** a task line under `openspec/changes/archive/` names `src/a.ts`
- **THEN** the task entry has no `paths` key

### Requirement: REQ-IDX-010 Change and capability entries
`build` SHALL write a `change` entry for each change folder, with the ID `change/<key>`. It SHALL write a `cap` entry for each capability that has a `specs/<cap>/spec.md` file, with the ID `cap/<name>`. Both kinds join the kind list of REQ-IDX-002. Both are canonical, and `check` ignores them. The index SHALL hold no `delta:`, `cap:`, or `main:` link. Those edges come from the `change`, `file`, and `status` fields at query time.

Refs: REQ-IDX-002, ADR-006

#### Scenario: SCN-IDX-010-1 Change entry
- **WHEN** change `009-add-x` holds a delta spec for capability `thing` with REQ-TH-001
- **THEN** the index holds `change/009` with a file in that folder, and no entry holds a `delta:`, `cap:`, or `main:` link

#### Scenario: SCN-IDX-010-2 Capability entry
- **WHEN** `openspec/specs/thing/spec.md` exists and an active change also holds a delta spec for `thing`
- **THEN** the index holds one `cap/thing` entry with the main spec file, and a second build writes the same entries

### Requirement: REQ-IDX-012 Design links
A task SHALL carry a `design:<key>/D<n>` link in its `links` list for each design decision that its line names. The name is a full ID like `045/D2`, or a bare `D3` that names a decision of its own change. A name with no matching decision SHALL make no link. This is the only link the index stores.

Refs: REQ-IDX-009, REQ-IDX-010

#### Scenario: SCN-IDX-012-1 Full and bare names
- **WHEN** a task of change `009-add-x` says `per 008/D2` and `D3`, and both decisions exist
- **THEN** the task entry has the links `design:008/D2` and `design:009/D3`

#### Scenario: SCN-IDX-012-2 No such decision
- **WHEN** a task line names `D9` and its change has no ninth decision
- **THEN** the task entry has no `design:` link

### Requirement: REQ-IDX-013 One change entry per key
Two change folders with the same key SHALL give one `change/<key>` entry. An active folder wins over an archived one. Among active folders the smaller folder name wins. Among archived folders the newest date prefix wins, then the smaller folder name.

Refs: REQ-IDX-010, REQ-IDX-005

#### Scenario: SCN-IDX-013-1 Active wins
- **WHEN** the folders `openspec/changes/009-add-x` and `openspec/changes/archive/2026-01-02-009-old` both exist
- **THEN** the index holds one `change/009` entry with a file in `009-add-x`

#### Scenario: SCN-IDX-013-2 Newest archive wins
- **WHEN** only the archived folders `2026-01-02-009-old` and `2026-03-04-009-new` exist
- **THEN** the index holds one `change/009` entry with a file in the folder dated 2026-03-04
