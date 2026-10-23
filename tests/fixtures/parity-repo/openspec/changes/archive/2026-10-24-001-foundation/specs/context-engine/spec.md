# Spec Delta

## Purpose

Defines the context engine. It indexes every ID in specs, decisions, tasks, code, and tests. It returns only the slice an agent needs for one task. The engine is deterministic and has no ML.

## ADDED Requirements

### Requirement: REQ-CTX-001 Index sources
`ctx build` SHALL scan `openspec/specs/**/*.md`, `openspec/changes/**/*.md` (including archive), `decisions/*.md`, `src/**`, and `tests/**`. It SHALL extract every ID that matches ADR-005 and every `Refs:` line, and write `.ctx/index.json`.

Refs: ADR-005

#### Scenario: SCN-CTX-001-1 Build from clean repo
- **WHEN** `ctx build` runs on this repository
- **THEN** `.ctx/index.json` exists and contains every REQ, SCN, ADR, and task ID present in the files

#### Scenario: SCN-CTX-001-2 Code and test tags
- **WHEN** `src/a.ts` has a comment `// REQ-CLD-002` and `tests/a.test.ts` has `// Covers: REQ-CLD-002`
- **THEN** the index records `src/a.ts` as an implementation of REQ-CLD-002 and `tests/a.test.ts` as its coverage

### Requirement: REQ-CTX-002 Index record shape
Each index entry SHALL have `id`, `kind` (`req`, `scn`, `adr`, `task`, `code`, `test`), `file`, `line`, `title`, `change` (change name or `main`), `status` (`active`, `archived`, `done`, `open`), and `refs` (array of IDs). The file SHALL be valid JSON sorted by `id`.

#### Scenario: SCN-CTX-002-1 Deterministic output
- **WHEN** `ctx build` runs twice without file changes
- **THEN** `.ctx/index.json` is byte-identical

### Requirement: REQ-CTX-003 Build speed
`ctx build` SHALL finish in under 1 second for a repository with up to 2,000 markdown and source files, measured on the CI runner. It SHALL use only the Python standard library.

#### Scenario: SCN-CTX-003-1 Timing
- **WHEN** `time python3 tools/ctx/ctx.py build` runs in CI
- **THEN** wall time is below 1.0 s

### Requirement: REQ-CTX-004 query
`ctx query <term>` SHALL return entries whose `id` or `title` contains the term, case-insensitive, with `--kind` and `--change` filters. Output SHALL be one line per hit: `id  kind  file:line  title`. `--json` SHALL print the entries.

#### Scenario: SCN-CTX-004-1 Query by word
- **WHEN** `ctx query lockfile` runs
- **THEN** every REQ whose title contains "lockfile" is listed

### Requirement: REQ-CTX-005 related
`ctx related <ID> [--depth N]` SHALL return the IDs reachable from `<ID>` by following `refs` in both directions up to depth N (default 1), grouped by kind. Scenarios of a requirement SHALL count as depth 0.

#### Scenario: SCN-CTX-005-1 Depth one
- **WHEN** REQ-A refs ADR-1 and REQ-B refs REQ-A
- **THEN** `ctx related REQ-A` lists ADR-1 and REQ-B and the scenarios of REQ-A

### Requirement: REQ-CTX-006 bundle
`ctx bundle <ID...> [--budget N] [--depth D]` SHALL print the markdown text of the named IDs, their scenarios, and their related entries up to depth D. The order SHALL be fixed: requested IDs, then ADRs, then related REQs, then tasks, then code and test paths. It SHALL stop adding entries when the output would exceed N characters (default 8000). It SHALL then print a final line `truncated: <count> entries omitted`.

#### Scenario: SCN-CTX-006-1 Budget respected
- **WHEN** `ctx bundle REQ-APPLY-001 --budget 2000` runs
- **THEN** the output is at most 2000 characters plus the trailer line

#### Scenario: SCN-CTX-006-2 Code paths only
- **WHEN** a bundle includes code entries
- **THEN** it prints their `file:line`, never the file contents

### Requirement: REQ-CTX-007 check
`ctx check` SHALL fail with exit 1 when any ID is duplicated, any `Refs:` target does not exist, or any REQ has no SCN. `--strict` SHALL also fail when an active REQ has no `Covers:` test tag or when a task cites a REQ that does not exist. Each finding SHALL print `file:line  rule  id`.

Refs: REQ-GOV-002

#### Scenario: SCN-CTX-007-1 Dangling ref
- **WHEN** a spec says `Refs: REQ-NOPE-001`
- **THEN** `ctx check` exits 1 and prints the file, line, and `dangling-ref REQ-NOPE-001`

#### Scenario: SCN-CTX-007-2 Strict coverage
- **WHEN** REQ-CLD-003 is in main specs and no test has `Covers: REQ-CLD-003`
- **THEN** `ctx check --strict` exits 1 and prints `uncovered REQ-CLD-003`

### Requirement: REQ-CTX-008 status
`ctx status` SHALL print the active changes, their task counts (done and open), and the number of uncovered active REQs. It SHALL read only the index.

#### Scenario: SCN-CTX-008-1 Fresh session
- **WHEN** an agent runs `ctx status` at session start
- **THEN** it sees which change is in progress and how many tasks remain
