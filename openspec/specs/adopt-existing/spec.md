# adopt-existing Specification

## Purpose
How a project that already has OpenSpec specs gets IDs and a usable strict mode in one session.

## Requirements

### Requirement: REQ-ADOPT-001 Dry run
`specctx adopt --dry-run` SHALL scan `openspec/specs/**/spec.md` and the deltas of active changes, list every `### Requirement:` and `#### Scenario:` header that carries no ID, and print the ID each would receive as `file:line  old header  ->  new header`. It SHALL print the derived CAP codes and SHALL write nothing. Exit 0 when nothing needs an ID. Exit 1 otherwise, with a last line `exit 1: <n> headers need an ID. Next: specctx adopt`.

Refs: ADR-002

#### Scenario: SCN-ADOPT-001-1 Mapping printed
- **WHEN** `adopt --dry-run` runs on the no-ID fixture
- **THEN** every header without an ID appears once with its new ID and no file changed

#### Scenario: SCN-ADOPT-001-2 Nothing to do
- **WHEN** `adopt --dry-run` runs on this repository
- **THEN** it prints `nothing to adopt` and exits 0

#### Scenario: SCN-ADOPT-001-3 The exit code has a reason
- **WHEN** `adopt --dry-run` runs on the no-ID fixture
- **THEN** it exits 1 and the last line is `exit 1: <n> headers need an ID. Next: specctx adopt`, where `<n>` is the count of `->` lines

### Requirement: REQ-ADOPT-002 Atomic assignment
`specctx adopt` SHALL write the dry run IDs into main spec headers and into every matching active delta header in one operation. Matching uses exact header text, or the delta `RENAMED` mapping. It SHALL run `check` before and after. A finding the write introduced SHALL restore every file and exit 1. Findings that existed before SHALL not block. It SHALL add derived CAP codes to `spec-ctx.toml` and write `adopt-report.md`.

Refs: REQ-ADOPT-001, REQ-CHK-001

#### Scenario: SCN-ADOPT-002-1 Main and delta agree
- **WHEN** the fixture has `### Requirement: Session timeout` in main and a MODIFIED block with the same header in an active change
- **THEN** both headers read `### Requirement: REQ-<CAP>-001 Session timeout` and `openspec validate --all --strict` passes

#### Scenario: SCN-ADOPT-002-2 Rollback
- **WHEN** a planted duplicate header makes `check` fail after the write
- **THEN** every file equals its content before `adopt` and the exit code is 1

#### Scenario: SCN-ADOPT-002-4 Legacy tasks do not block
- **WHEN** the fixture tasks cite no REQ and `check` reports `task-without-req` before the write
- **THEN** `adopt` still writes the IDs and exits 0

#### Scenario: SCN-ADOPT-002-3 Unmatched delta reported
- **WHEN** a delta header matches no main header and no RENAMED mapping
- **THEN** that header is unchanged and the report lists it under `unmatched`

### Requirement: REQ-ADOPT-003 Idempotent
A second `specctx adopt` on a tree that the first one processed SHALL change no file and print `nothing to adopt`. A header that already starts with a valid ID SHALL never be rewritten.

#### Scenario: SCN-ADOPT-003-1 Second run
- **WHEN** `adopt` runs twice on the no-ID fixture
- **THEN** the tree after the second run is byte-identical to the tree after the first

### Requirement: REQ-ADOPT-004 CAP derivation
A capability folder with no code in `[ids] caps` SHALL get a code from the upper case first letters of its kebab segments, at most 6 letters. A one segment name SHALL take its first three letters. On a collision the code SHALL take two letters from the first segment, then three, then a suffix letter from `B` to `Z`. Codes SHALL match `[A-Z]{2,6}`. The code and its path SHALL be written to `spec-ctx.toml` under `[ids] caps` and `[ids] paths`, so later `id new` calls accept it.

Refs: ADR-002

#### Scenario: SCN-ADOPT-004-1 Derived codes
- **WHEN** the fixture has capabilities `user-auth` and `profile-schema`
- **THEN** the codes are `UA` and `PS` and both are in `spec-ctx.toml` after `adopt`

#### Scenario: SCN-ADOPT-004-2 Collision
- **WHEN** the fixture has `user-auth` and `upload-api`
- **THEN** the codes are `UA` and `UPA`

#### Scenario: SCN-ADOPT-004-3 One segment
- **WHEN** the fixture has a capability `telemetry`
- **THEN** the code is `TEL`

### Requirement: REQ-ADOPT-005 Baseline ratchet
`specctx baseline write` SHALL record every current finding of `uncovered`, `scenario-untested`, `done-without-evidence`, `manual-evidence`, `task-without-req`, `task-without-verify`, and `missing-id` as sorted `rule id` pairs in `.ctx/baseline.json`. A `missing-id` pair has `<file> <title>` as id. `check` and `check --strict` SHALL hide a finding in the baseline. `baseline prune` SHALL drop entries that no longer fire and print the count. No command SHALL add a single entry.

Refs: REQ-CHK-002

#### Scenario: SCN-ADOPT-005-1 Day one strict
- **WHEN** `baseline write` runs on the no-ID fixture after `adopt`
- **THEN** `check --strict` exits 0 and `.ctx/baseline.json` lists the pre-existing uncovered requirements and the legacy tasks without a REQ citation

#### Scenario: SCN-ADOPT-005-2 New debt is visible
- **WHEN** a new requirement without a test is added after the baseline
- **THEN** `check --strict` reports `uncovered` for it and for nothing in the baseline

#### Scenario: SCN-ADOPT-005-3 Prune
- **WHEN** a test gains `Covers:` for a baselined requirement and `baseline prune` runs
- **THEN** that entry is gone and the command prints `pruned 1`

#### Scenario: SCN-ADOPT-005-4 Unmatched delta headers go in the baseline
- **WHEN** an active delta holds a MODIFIED header that matches no main requirement, `adopt` leaves it without an ID, and `baseline write` runs
- **THEN** `.ctx/baseline.json` holds `missing-id <file> <title>` for that header and each of its scenarios, and `gate --strict` exits 0

#### Scenario: SCN-ADOPT-005-5 A new header without an ID still fires
- **WHEN** a main spec gains `### Requirement: Rate limit` without an ID after the baseline
- **THEN** `check` reports `missing-id` for it and for nothing in the baseline

### Requirement: REQ-ADOPT-006 Two documented paths
The README SHALL show a fresh path (`openspec init`, then `specctx init --all`) and an existing path (`specctx init --all`, `adopt --dry-run`, `adopt`, `task backfill`, `baseline write`). The existing path section SHALL say that legacy tasks stay in the baseline until an agent adds `[REQ-...]` citations and a Verify code span. `baseline prune` then drops them. Each path SHALL have an end to end test in CI that starts from a fixture and ends with `specctx gate --strict` exit 0.

#### Scenario: SCN-ADOPT-006-1 Existing path end to end
- **WHEN** `tests/paths/existing.sh` runs on the no-ID fixture
- **THEN** it ends with `gate --strict` exit 0

#### Scenario: SCN-ADOPT-006-2 Fresh path end to end
- **WHEN** `tests/paths/fresh.sh` runs on an empty dir
- **THEN** it ends with `gate --strict` exit 0

### Requirement: REQ-ADOPT-007 Lint ratchet
`baseline write` SHALL record one `lint <file> <rule> <count>` line per file and rule with hard lint findings on the gate globs. `<rule>` is `tells:<name>` or `ste:<name>`. `gate` SHALL fail the lint step when a count rises above its line. The detail has one line per risen key, worst first, at most 50 lines, then `... <k> more line(s)`. `baseline prune` SHALL drop a line whose count is 0 and lower a line whose count fell.

Refs: REQ-ADOPT-005, REQ-CLI-004

#### Scenario: SCN-ADOPT-007-1 Day one gate on dirty prose
- **WHEN** the no-ID fixture holds a `docs/notes.md` with one dash and one semicolon, and the existing path runs
- **THEN** `.ctx/baseline.json` holds `lint docs/notes.md tells:dash 1` and `lint docs/notes.md ste:semicolon 1`, and `gate --strict` exits 0

#### Scenario: SCN-ADOPT-007-2 A rise fails the gate
- **WHEN** `docs/notes.md` gains a second dash after the baseline
- **THEN** `gate` prints `linters: fail, 1 new finding(s) in 1 file(s)` and `docs/notes.md  tells:dash  2 (baseline 1)`, and exits 1

#### Scenario: SCN-ADOPT-007-3 Prune lowers and drops
- **WHEN** the semicolon leaves `docs/notes.md` and one of two baselined dashes leaves, and `baseline prune` runs
- **THEN** it prints `pruned 2`, the `ste:semicolon` line is gone, and the `tells:dash` line reads `1`
