## ADDED Requirements

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
