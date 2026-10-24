# adopt-existing

## Purpose

How a project that already has OpenSpec specs gets IDs and a usable strict mode in one session.

## ADDED Requirements

### Requirement: REQ-ADOPT-001 Dry run
`specctx adopt --dry-run` SHALL scan `openspec/specs/**/spec.md` and the deltas of active changes, list every `### Requirement:` and `#### Scenario:` header that carries no ID, and print the ID each would receive as `file:line  old header  ->  new header`. It SHALL print the derived CAP codes and SHALL write nothing. Exit 0 when nothing needs an ID.

Refs: ADR-002

#### Scenario: SCN-ADOPT-001-1 Mapping printed
- **WHEN** `adopt --dry-run` runs on the no-ID fixture
- **THEN** every header without an ID appears once with its new ID and no file changed

#### Scenario: SCN-ADOPT-001-2 Nothing to do
- **WHEN** `adopt --dry-run` runs on this repository
- **THEN** it prints `nothing to adopt` and exits 0

### Requirement: REQ-ADOPT-002 Atomic assignment
`specctx adopt` SHALL write the IDs from the dry run into the main spec headers and into every matching header of active change deltas in one operation. Matching SHALL use exact header text, or the `RENAMED` mapping of the delta when present. After writing it SHALL run `check`. On a finding not in the baseline it SHALL restore every file and exit 1 with the findings. It SHALL add derived CAP codes to `spec-ctx.toml` and write `adopt-report.md`.

Refs: REQ-ADOPT-001, REQ-CHK-001

#### Scenario: SCN-ADOPT-002-1 Main and delta agree
- **WHEN** the fixture has `### Requirement: Session timeout` in main and a MODIFIED block with the same header in an active change
- **THEN** both headers read `### Requirement: REQ-<CAP>-001 Session timeout` and `openspec validate --all --strict` passes

#### Scenario: SCN-ADOPT-002-2 Rollback
- **WHEN** a planted duplicate header makes `check` fail after the write
- **THEN** every file equals its content before `adopt` and the exit code is 1

#### Scenario: SCN-ADOPT-002-3 Unmatched delta reported
- **WHEN** a delta header matches no main header and no RENAMED mapping
- **THEN** that header is unchanged and the report lists it under `unmatched`

### Requirement: REQ-ADOPT-003 Idempotent
A second `specctx adopt` on a tree that the first one processed SHALL change no file and print `nothing to adopt`. A header that already starts with a valid ID SHALL never be rewritten.

#### Scenario: SCN-ADOPT-003-1 Second run
- **WHEN** `adopt` runs twice on the no-ID fixture
- **THEN** the tree after the second run is byte-identical to the tree after the first

### Requirement: REQ-ADOPT-004 CAP derivation
A capability folder with no code in `[ids] caps` SHALL get a code from the upper case first letters of its kebab segments, at most 6 letters. On a collision a digit SHALL be appended. The code and its path SHALL be written to `spec-ctx.toml` under `[ids] caps` and `[ids] paths`, so later `id new` calls accept it.

Refs: ADR-002

#### Scenario: SCN-ADOPT-004-1 Derived codes
- **WHEN** the fixture has capabilities `user-auth` and `profile-schema`
- **THEN** the codes are `UA` and `PS` and both are in `spec-ctx.toml` after `adopt`

#### Scenario: SCN-ADOPT-004-2 Collision
- **WHEN** the fixture has `user-auth` and `upload-api`
- **THEN** the codes are `UA` and `UA2`

### Requirement: REQ-ADOPT-005 Baseline ratchet
`specctx baseline write` SHALL record every current strict finding of the rules `uncovered`, `scenario-untested`, `done-without-evidence`, and `manual-evidence` as sorted `rule id` pairs in `.ctx/baseline.json`. `check --strict` SHALL not report a finding that is in the baseline. `baseline prune` SHALL drop entries that no longer fire and print the count. There SHALL be no command that adds a single entry.

Refs: REQ-CHK-002

#### Scenario: SCN-ADOPT-005-1 Day one strict
- **WHEN** `baseline write` runs on the no-ID fixture after `adopt`
- **THEN** `check --strict` exits 0 and `.ctx/baseline.json` lists the pre-existing uncovered requirements

#### Scenario: SCN-ADOPT-005-2 New debt is visible
- **WHEN** a new requirement without a test is added after the baseline
- **THEN** `check --strict` reports `uncovered` for it and for nothing in the baseline

#### Scenario: SCN-ADOPT-005-3 Prune
- **WHEN** a test gains `Covers:` for a baselined requirement and `baseline prune` runs
- **THEN** that entry is gone and the command prints `pruned 1`

### Requirement: REQ-ADOPT-006 Two documented paths
The README SHALL show a fresh path (`openspec init`, then `specctx init --all`) and an existing path (`specctx init --all`, `adopt --dry-run`, `adopt`, `task backfill`, `baseline write`). Each path SHALL have an end to end test in CI that starts from a fixture and ends with `specctx gate --strict` exit 0.

#### Scenario: SCN-ADOPT-006-1 Existing path end to end
- **WHEN** `tests/paths/existing.sh` runs on the no-ID fixture
- **THEN** it ends with `gate --strict` exit 0

#### Scenario: SCN-ADOPT-006-2 Fresh path end to end
- **WHEN** `tests/paths/fresh.sh` runs on an empty dir
- **THEN** it ends with `gate --strict` exit 0
