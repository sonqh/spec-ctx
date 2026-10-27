# query (delta)

## MODIFIED Requirements

### Requirement: REQ-QRY-001 query
`specctx query <term...>` SHALL return canonical entries that match every term in `id`, `title`, or `text`, case-insensitive. Score: 3 per term in `id`, 2 in `title`, 1 in `text`. Highest first, ties by `id`. Output: one untruncated line per hit, `id  kind  status  file:line  title`. Flags: `--kind` (any case, `REQ` and `req` match the same entries), `--change`, `--all` (include non-canonical), `--limit N` (default 20), `--json`.

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

#### Scenario: SCN-QRY-001-4 Kind in upper case
- **WHEN** `specctx query revert --kind REQ` runs on the parity fixture
- **THEN** the output equals the output of `specctx query revert --kind req` and is not empty
