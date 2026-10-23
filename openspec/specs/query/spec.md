# query Specification

## Purpose
Three read commands give an agent the slice of the spec tree one task needs. Find IDs by words. See what links to an ID. Get a budgeted markdown bundle.

## Requirements

### Requirement: REQ-QRY-001 query
`specctx query <term...>` SHALL return canonical entries that match every term in `id`, `title`, or `text`, case-insensitive. Score: 3 per term in `id`, 2 in `title`, 1 in `text`. Highest first, ties by `id`. Output: one untruncated line per hit, `id  kind  status  file:line  title`. Flags: `--kind`, `--change`, `--all` (include non-canonical), `--limit N` (default 20), `--json`.

Refs: ADR-003

#### Scenario: SCN-QRY-001-1 Two terms
- **WHEN** `specctx query push main` runs on the parity fixture
- **THEN** every hit contains both terms and no hit lacks one

#### Scenario: SCN-QRY-001-2 No duplicates
- **WHEN** `specctx query revert` runs without `--all`
- **THEN** each ID appears once

#### Scenario: SCN-QRY-001-3 Ranking
- **WHEN** `specctx query APPLY-007` runs
- **THEN** `REQ-APPLY-007` is the first line

### Requirement: REQ-QRY-002 related
`specctx related <ID> [--depth N] [--all]` SHALL print one line per linked entry: `<kind>  <id>  <status>  <file>:<line>  <reason>`. Reasons: `scenario of`, `ref from`, `ref to`, `decision for`, `task cites`, `implements`, `covers`. Default depth 1. Canonical entries only unless `--all`.

#### Scenario: SCN-QRY-002-1 Reasons
- **WHEN** `specctx related REQ-APPLY-005` runs on the parity fixture
- **THEN** every line has a reason from the list and `SCN-APPLY-005-1` has `scenario of`

### Requirement: REQ-QRY-003 bundle
`specctx bundle <ID...> [--budget N] [--depth D] [--all]` SHALL print the canonical text of each named ID, its scenarios, the decisions that reference it, and related entries to depth D. Each block SHALL start with `-- <id> | <file>:<line> | <status> | <reason>`. Order: requested IDs, ADRs, decisions, related REQs, tasks, code and test paths. It SHALL stop at N characters (default 8000) and print `truncated: <count> entries omitted: <ids>`.

#### Scenario: SCN-QRY-003-1 Budget respected
- **WHEN** `specctx bundle REQ-APPLY-001 --budget 2000` runs
- **THEN** the output is at most 2000 characters plus the trailer line

#### Scenario: SCN-QRY-003-2 Code paths only
- **WHEN** a bundle includes code entries
- **THEN** it prints their `file:line`, never file contents

#### Scenario: SCN-QRY-003-3 Canonical text
- **WHEN** a main spec and an archive copy differ for an ID
- **THEN** the bundle prints the main text

#### Scenario: SCN-QRY-003-4 Parity
- **WHEN** both engines run `bundle REQ-APPLY-001 --budget 3000` on the parity fixture
- **THEN** the outputs are byte-identical
