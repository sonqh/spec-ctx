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

### Requirement: REQ-QRY-009 Task edges
A task that is the start SHALL reach the requirements and scenarios of the delta specs in its own change folder, with the reason `delta in change of <task>`. A task SHALL reach the decisions in its `design:` links, with the reason `design named in <task>`. A decision SHALL reach the tasks that name it, with the reason `task names <decision>`. A requirement SHALL NOT reach the tasks of its change by these edges.

Refs: REQ-QRY-002, REQ-IDX-010, REQ-IDX-012

#### Scenario: SCN-QRY-009-1 Task to deltas and decisions
- **WHEN** `related 009/1.1` runs and the task names `D3` in a change with delta REQ-TH-001 that the task does not cite
- **THEN** the output has REQ-TH-001 with `delta in change of 009/1.1` and `009/D3` with `design named in 009/1.1`

#### Scenario: SCN-QRY-009-2 One way only
- **WHEN** `related REQ-TH-001` runs for a requirement that a delta spec of change 009 holds
- **THEN** the output has no task that only shares the change, and `related 009/D3` lists the task with `task names 009/D3`

#### Scenario: SCN-QRY-009-3 Archived change
- **WHEN** change 009 sits in the archive and `related 009/1.1` runs
- **THEN** the output has the main requirement for each delta ID of the archived change, with `delta in change of 009/1.1`

### Requirement: REQ-QRY-010 Capability edges
A requirement SHALL reach its capability, with the reason `capability of <req>`. The name comes from the `specs/<cap>/spec.md` path. A capability SHALL reach its requirements, with the reason `requirement in <cap>`, only when it is the start. `related` and `bundle` SHALL also list the main version of a modified requirement, with the reason `main version of <ID>`.

Refs: REQ-IDX-010, REQ-QRY-009

#### Scenario: SCN-QRY-010-1 Requirement and capability
- **WHEN** `related REQ-TH-001` and `related cap/thing` run
- **THEN** the first output has `cap/thing` with `capability of REQ-TH-001` and the second has REQ-TH-001 with `requirement in cap/thing`

#### Scenario: SCN-QRY-010-2 Main version
- **WHEN** `bundle REQ-TH-001` runs and a delta MODIFIES it
- **THEN** the output has the delta block and a second block from the main spec with the reason `main version of REQ-TH-001`

#### Scenario: SCN-QRY-010-3 No siblings at depth 2
- **WHEN** `related REQ-TH-001 --depth 2` runs and `cap/thing` also holds REQ-TH-002
- **THEN** the output has `cap/thing` and does not have REQ-TH-002 through it

### Requirement: REQ-QRY-011 Change as a start
`related` and `bundle` SHALL take a change key or a folder name where they take an ID. A change SHALL reach its delta requirements and scenarios with the reason `delta in <change>`, and its capabilities with the reason `capability touched by <change>`. An ID wins over a change, and a change wins over a path.

Refs: REQ-IDX-010, REQ-QRY-005

#### Scenario: SCN-QRY-011-1 Related by change
- **WHEN** `related 009` and `related 009-add-x` run
- **THEN** both outputs are equal and list the capabilities of the change with `capability touched by change/009`

### Requirement: REQ-QRY-012 Budget order
When a bundle passes its budget, `bundle` SHALL keep entries by class. Class 0 holds the requested IDs and the main version of one. Class 1 holds code and test lines at depth 1. Class 2 holds ADRs, active decisions, requirements, capabilities, changes, and tasks at depth 1. Class 3 holds archived decisions and entries from depth 2. A decision that names a requested ID counts as depth 1. The print order of REQ-QRY-003 does not change.

Refs: REQ-QRY-003

#### Scenario: SCN-QRY-012-1 Code and test lines first
- **WHEN** a requirement has 3 code lines, 2 test lines, and neighbors that fill the budget
- **THEN** all 5 lines are in the output and the omitted IDs are neighbor requirements or tasks

#### Scenario: SCN-QRY-012-2 This repository
- **WHEN** `bundle REQ-LOOP-001` runs at the default budget on a temp copy of this repository
- **THEN** every code and test line that tags REQ-LOOP-001 in the index of the copy is in the output. The test never reads or writes the real `.ctx/index.json`.

#### Scenario: SCN-QRY-012-3 Decisions for a requested ID
- **WHEN** an active and an archived decision both name a requested requirement, and the budget fits one
- **THEN** the active decision stays and the archived decision is in the omitted list

### Requirement: REQ-QRY-013 Plain query hides structure
`query` with no `--kind` SHALL return no `cap` or `change` entry, so the top 20 of a plain query does not change. `query --kind cap` and `query --kind change` SHALL list them.

Refs: REQ-QRY-001, REQ-IDX-010

#### Scenario: SCN-QRY-013-1 Plain query
- **WHEN** `query thing` runs with no `--kind` and `cap/thing` and `change/009` match
- **THEN** the output has no `cap/` or `change/` row, and `query thing --change 009` has none either

#### Scenario: SCN-QRY-013-2 Kind filter
- **WHEN** `query --kind cap thing` and `query --kind change 009` run
- **THEN** the first lists `cap/thing` and the second lists `change/009`

### Requirement: REQ-QRY-014 Omitted trailer
The `truncated:` trailer of `bundle` SHALL list the omitted IDs in print order, not in class order. A requested ID that does not fit SHALL stay in the list at its print position.

Refs: REQ-QRY-003, REQ-QRY-012

#### Scenario: SCN-QRY-014-1 Print order
- **WHEN** a bundle omits a task and a requirement that sit in different classes
- **THEN** the trailer lists the requirement before the task, as the blocks print
