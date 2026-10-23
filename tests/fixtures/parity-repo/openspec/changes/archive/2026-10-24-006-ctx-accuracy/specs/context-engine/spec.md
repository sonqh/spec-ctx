# context-engine

## MODIFIED Requirements

### Requirement: REQ-CTX-001 Index sources
`ctx build` SHALL scan `openspec/specs/**/*.md`, `openspec/changes/**/*.md` (including archive), `decisions/*.md`, `src/**`, and `tests/**`. It SHALL skip `tests/fixtures/**` and `node_modules/**`. It SHALL extract every ID that matches ADR-005, every `Refs:` line, every design decision bullet under `## Decisions`, and write `.ctx/index.json`.

Refs: ADR-005, REQ-CTX-011

#### Scenario: SCN-CTX-001-1 Build from clean repo
- **WHEN** `ctx build` runs on this repository
- **THEN** `.ctx/index.json` exists and contains every REQ, SCN, ADR, task, and decision ID present in the files

#### Scenario: SCN-CTX-001-2 Code and test tags
- **WHEN** `src/a.ts` has a comment `// REQ-CLD-002` and `tests/a.test.ts` has `// Covers: REQ-CLD-002`
- **THEN** the index records `src/a.ts` as an implementation of REQ-CLD-002 and `tests/a.test.ts` as its coverage

### Requirement: REQ-CTX-002 Index record shape
Each index entry SHALL have `id`, `kind` (`req`, `scn`, `adr`, `decision`, `task`, `code`, `test`), `file`, `line`, `title`, `text`, `change` (change name or `main`), `status` (`active`, `modified`, `archived`, `done`, `open`), `canonical` (boolean), and `refs` (array of IDs). `text` SHALL hold the body of a requirement, scenario, or decision in lower case, and SHALL be empty for code and test entries. The file SHALL be valid JSON sorted by `id` then `file`. The file SHALL also hold `scanned` with the file count and the newest mtime.

#### Scenario: SCN-CTX-002-1 Deterministic output
- **WHEN** `ctx build` runs twice without file changes
- **THEN** `.ctx/index.json` is byte-identical

#### Scenario: SCN-CTX-002-2 Text field
- **WHEN** a requirement body contains the words `push to main`
- **THEN** its entry's `text` contains `push to main`

### Requirement: REQ-CTX-004 query
`ctx query <term...>` SHALL split the input into terms. It SHALL return canonical entries that match every term in `id`, `title`, or `text`, case-insensitive. Hits SHALL be ranked by a score: 3 per term that matches `id`, 2 per term in `title`, 1 per term in `text`. Ties SHALL sort by `id`. Output SHALL be one line per hit: `id  kind  status  file:line  title`, with no truncation. `--kind`, `--change`, `--all` (include non-canonical), `--limit N` (default 20) and `--json` SHALL be supported.

Refs: REQ-CTX-009

#### Scenario: SCN-CTX-004-1 Query by word
- **WHEN** `ctx query lockfile` runs
- **THEN** every canonical REQ whose title or text contains "lockfile" is listed

#### Scenario: SCN-CTX-004-2 Two terms
- **WHEN** `ctx query push main` runs
- **THEN** REQ-CDX-004 and the hook requirement for `block-push-main` are listed and no entry that lacks either term is listed

#### Scenario: SCN-CTX-004-3 No duplicates
- **WHEN** `ctx query revert` runs without `--all`
- **THEN** `REQ-APPLY-007` appears once, from `openspec/specs/`

#### Scenario: SCN-CTX-004-4 Ranking
- **WHEN** `ctx query APPLY-007` runs
- **THEN** `REQ-APPLY-007` is the first line

### Requirement: REQ-CTX-006 bundle
`ctx bundle <ID...> [--budget N] [--depth D] [--all]` SHALL print the markdown text of the canonical entry for each named ID. It SHALL add their scenarios, the decisions that reference them, and their related entries up to depth D. Each block SHALL start with one provenance line `-- <id> | <file>:<line> | <status> | <reason>`. The order SHALL be fixed: requested IDs, then ADRs, then decisions, then related REQs, then tasks, then code and test paths. It SHALL stop adding entries when the output would exceed N characters (default 8000) and then print `truncated: <count> entries omitted: <ids>`.

Refs: REQ-CTX-009, REQ-CTX-011

#### Scenario: SCN-CTX-006-1 Budget respected
- **WHEN** `ctx bundle REQ-APPLY-001 --budget 2000` runs
- **THEN** the output is at most 2000 characters plus the trailer line

#### Scenario: SCN-CTX-006-2 Code paths only
- **WHEN** a bundle includes code entries
- **THEN** it prints their `file:line`, never the file contents

#### Scenario: SCN-CTX-006-3 Canonical text
- **WHEN** `openspec/specs/apply-pipeline/spec.md` and an archive copy differ for REQ-APPLY-001
- **THEN** `ctx bundle REQ-APPLY-001` prints the text from `openspec/specs/`

#### Scenario: SCN-CTX-006-4 Provenance line
- **WHEN** `ctx bundle REQ-APPLY-001` runs
- **THEN** the first line starts with `-- REQ-APPLY-001 | openspec/specs/apply-pipeline/spec.md:` and ends with `requested`

#### Scenario: SCN-CTX-006-5 Decision included
- **WHEN** a design decision has `Refs: REQ-APPLY-007` and `ctx bundle REQ-APPLY-007` runs
- **THEN** that decision text appears after the ADR section with reason `decision for REQ-APPLY-007`

### Requirement: REQ-CTX-007 check
`ctx check` SHALL keep every rule from 001. Rules: missing-id, scenario-id-mismatch, bad-ref, task-without-req, task-without-verify, duplicate-id, reused-id, dangling-ref, req-without-scn. It SHALL add `code-tag-no-canonical` for a code tag whose REQ has no canonical entry. `--strict` SHALL keep unknown-task-req and uncovered. It SHALL add `scenario-untested` for a scenario ID that no test file names. Each finding SHALL print `file:line  rule  id`. Exit 1 on any finding.

Refs: REQ-GOV-002

#### Scenario: SCN-CTX-007-1 Dangling ref
- **WHEN** a spec says `Refs: REQ-NOPE-001`
- **THEN** `ctx check` exits 1 and prints the file, line, and `dangling-ref REQ-NOPE-001`

#### Scenario: SCN-CTX-007-2 Strict coverage
- **WHEN** REQ-CLD-003 is in main specs and no test has `Covers: REQ-CLD-003`
- **THEN** `ctx check --strict` exits 1 and prints `uncovered REQ-CLD-003`

#### Scenario: SCN-CTX-007-3 Clean tree
- **WHEN** `ctx check --strict` runs on this repository after this change
- **THEN** it prints `0 finding(s)` and exits 0

#### Scenario: SCN-CTX-007-4 Tag to archived-only REQ
- **WHEN** `src/x.ts` carries `// REQ-OLD-001` and that ID exists only under `openspec/changes/archive/`
- **THEN** `check` reports `code-tag-no-canonical` for `src/x.ts`

#### Scenario: SCN-CTX-007-5 Scenario without test
- **WHEN** `SCN-APPLY-001-2` appears in no file under `tests/`
- **THEN** `check --strict` reports `scenario-untested SCN-APPLY-001-2`

### Requirement: REQ-CTX-008 status
`ctx status` SHALL print the active changes, their task counts (done and open), and the number of uncovered active REQs. When no change is active it SHALL print `no active change`, the name of the last archived change, and the count and first line of each `open_questions` item in `.ctx/handoff.md`. It SHALL read only the index and the handoff file.

Refs: REQ-BOOT-004

#### Scenario: SCN-CTX-008-1 Fresh session
- **WHEN** an agent runs `ctx status` at session start
- **THEN** it sees which change is in progress and how many tasks remain

#### Scenario: SCN-CTX-008-2 Nothing active
- **WHEN** every change is archived and the handoff has two open questions
- **THEN** `status` prints `no active change`, the last archived change name, and `open_questions: 2` followed by two lines

## ADDED Requirements

### Requirement: REQ-CTX-009 One canonical entry per ID
For each REQ, SCN, and ADR ID the index SHALL mark exactly one entry `canonical: true`. Order: an active change (ADDED or MODIFIED block), then `openspec/specs/`, then `openspec/changes/archive/`. An entry under a MODIFIED header SHALL have `status: modified` and SHALL not count as a duplicate. `query`, `related`, `bundle` and `by_id` SHALL use canonical entries only unless `--all` is passed.

Refs: REQ-GOV-002, ADR-005

#### Scenario: SCN-CTX-009-1 Main wins over archive
- **WHEN** `REQ-APPLY-007` exists in `openspec/specs/` and in an archive and in no active change
- **THEN** only the `openspec/specs/` entry has `canonical: true`

#### Scenario: SCN-CTX-009-2 Pending change wins over main
- **WHEN** an active change has `REQ-APPLY-007` under `## MODIFIED Requirements`
- **THEN** that entry is canonical, has `status: modified`, and `check` reports no `duplicate-id` for it

#### Scenario: SCN-CTX-009-3 Count
- **WHEN** `ctx build` runs on this repository
- **THEN** the count of canonical REQ entries equals the count of distinct REQ IDs

### Requirement: REQ-CTX-010 Stale index detection
Every command except `build` SHALL compare the `scanned` record in the index with a fresh walk of the source paths (count and newest mtime). On a mismatch or a missing index it SHALL rebuild, print `index rebuilt` on stderr, and then answer. The walk SHALL not parse file contents.

Refs: ADR-003, REQ-CTX-003

#### Scenario: SCN-CTX-010-1 Edited spec
- **WHEN** a spec file is edited after `build` and `ctx query x` runs
- **THEN** stderr contains `index rebuilt` and the answer reflects the edit

#### Scenario: SCN-CTX-010-2 Fresh index is silent
- **WHEN** nothing changed since `build`
- **THEN** `ctx query x` prints nothing on stderr

### Requirement: REQ-CTX-011 Design decisions are indexed
Each bullet under `## Decisions` in a `design.md` SHALL be an entry of kind `decision`. Its ID SHALL be `<change>/D<n>` by order of appearance. Its `title` SHALL be the first sentence and its `text` the full bullet. Its `refs` SHALL come from a `Refs:` fragment inside the bullet. Decisions SHALL be canonical in the change that holds them.

Refs: ADR-005

#### Scenario: SCN-CTX-011-1 Decision entry
- **WHEN** `design.md` of change 005 has a decision bullet ending in `Refs: REQ-APPLY-007`
- **THEN** the index has `005-ux-polish/D<n>` with `refs: ["REQ-APPLY-007"]`

### Requirement: REQ-CTX-012 related shows provenance
`ctx related <ID>` SHALL print one line per related entry: `<kind>  <id>  <status>  <file>:<line>  <reason>`. Reasons SHALL be `scenario of`, `ref from`, `ref to`, `decision for`, `task cites`, `implements`, `covers`. It SHALL list canonical entries only unless `--all` is passed.

Refs: REQ-CTX-009

#### Scenario: SCN-CTX-012-1 Reasons
- **WHEN** `ctx related REQ-APPLY-005` runs
- **THEN** every line has a reason from the list and `SCN-APPLY-005-1` has `scenario of`
