# query Specification

## Purpose
Three read commands give an agent the slice of the spec tree one task needs. Find IDs by words. See what links to an ID. Get a budgeted markdown bundle.

## Requirements

### Requirement: REQ-QRY-001 query
`specctx query <term...>` SHALL return canonical entries that match every term in `id`, `title`, or `text`, case-insensitive. Score: 3 per term in `id`, 2 in `title`, 1 in `text`. Highest first, ties by `id`. Output: one untruncated line per hit, `id  kind  status  file:line  title`. Flags: `--kind` (any case), `--change`, `--all` (every copy), `--limit N` (default 20), `--json`. No term with `--change` SHALL list every entry of that change. No term without it is a usage error.

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

#### Scenario: SCN-QRY-001-5 A change with no term
- **WHEN** `specctx query --change add-mfa --kind req` runs on the no-ID fixture after `adopt`
- **THEN** it lists every canonical requirement of `add-mfa`, one per line, sorted by ID, and `specctx query --kind req` with no term and no `--change` exits 2 with `query needs at least one term`

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

### Requirement: REQ-QRY-004 Bundle block
`specctx bundle <REQ-ID...> --block` SHALL print the canonical block of each requirement exactly as it sits in its spec file. That is the header, the body, the Refs line, and every scenario. It SHALL print no provenance line, no related entry, and no trailer. It SHALL ignore `--budget` and `--depth`. One blank line separates blocks. An ID that is not a REQ SHALL exit 2.

Refs: REQ-QRY-003

#### Scenario: SCN-QRY-004-1 Verbatim block
- **WHEN** `bundle REQ-APPLY-001 --block` runs
- **THEN** the output equals the requirement in the main spec. It runs from the header to the line before the next requirement header. Trailing blank lines go and one newline stays

#### Scenario: SCN-QRY-004-2 Two IDs and no budget
- **WHEN** `bundle REQ-APPLY-001 REQ-APPLY-007 --block --budget 10` runs
- **THEN** the output holds both blocks, separated by one blank line, and holds no line that starts with `-- `

#### Scenario: SCN-QRY-004-3 Not a requirement
- **WHEN** `bundle SCN-APPLY-001-9 --block` runs
- **THEN** the exit code is 2 and stderr names the ID

### Requirement: REQ-QRY-005 Lookup by file
`specctx related <path>` and `specctx bundle <path>` SHALL accept a file where they accept an ID. The path is relative to the root, or any path that resolves inside it. The answer SHALL list the requirements, scenarios, tasks, and decisions linked to the file, in the format of REQ-QRY-002. It SHALL list no code and no test entry. `--depth` counts from the entries that the file links to. An ID wins over a path of the same text.

Refs: REQ-QRY-002, REQ-QRY-003

#### Scenario: SCN-QRY-005-1 Related by path
- **WHEN** `src/a.ts` has a code tag for REQ-AB-001 and `related src/a.ts` runs
- **THEN** the output has the line of REQ-AB-001 and the lines of its scenarios, in the format of `related REQ-AB-001`, and no code or test line

#### Scenario: SCN-QRY-005-2 Bundle by path
- **WHEN** `bundle src/a.ts` runs for the same file
- **THEN** the output has the provenance line and block of REQ-AB-001 and a reason that starts with `implements`

#### Scenario: SCN-QRY-005-3 Absolute path and subfolder
- **WHEN** `related` gets the absolute path of the file, or runs from `src/` with `a.ts`
- **THEN** the output equals the output for `src/a.ts`

### Requirement: REQ-QRY-006 File edge reasons
A file SHALL link to an entry in three ways. Each has its own reason. `implements, tag at <file>:<line>`: a code tag names the REQ. `covers, tag at <file>:<line>`: a `Covers:` tag names the REQ. `mentions, in task line`: a task of an active change names the file in backticks.

Refs: REQ-QRY-005, REQ-IDX-008, REQ-IDX-009

#### Scenario: SCN-QRY-006-1 Implements and covers
- **WHEN** `src/a.ts` has two REQ IDs on one tag line and `tests/a.test.ts` has a `Covers:` line
- **THEN** `related src/a.ts` shows both REQs with `implements, tag at src/a.ts:1` and `related tests/a.test.ts` shows the REQ with `covers, tag at`

#### Scenario: SCN-QRY-006-3 Mentions
- **WHEN** a task line of an active change names `src/a.ts` in backticks
- **THEN** `related src/a.ts` shows the task with the reason `mentions, in task line`

### Requirement: REQ-QRY-008 Path errors and no links
A path that is not a file inside the repository SHALL exit 2 with one line on stderr that names the path. That covers a missing path, a directory, and a path outside the root. A file with no links SHALL print `no links: <path>` and exit 0. With `--json`, `related` prints `[]` for it. An unknown ID keeps the line `unknown id <ID>`.

Refs: REQ-QRY-005

#### Scenario: SCN-QRY-008-1 Missing file
- **WHEN** `related src/none.ts` runs and the file does not exist
- **THEN** the exit code is 2 and stderr is one line that names `src/none.ts`

#### Scenario: SCN-QRY-008-2 Outside and directory
- **WHEN** `related` gets a path outside the root, or the directory `src`
- **THEN** the exit code is 2 and stderr is one line that names the path

#### Scenario: SCN-QRY-008-3 No links
- **WHEN** `related README-none.md` runs for an existing file with no links
- **THEN** stdout is `no links: <path>` and the exit code is 0

#### Scenario: SCN-QRY-008-4 Unknown ID
- **WHEN** `related REQ-NOPE-001` runs
- **THEN** stderr is `unknown id REQ-NOPE-001` and the exit code is 2
