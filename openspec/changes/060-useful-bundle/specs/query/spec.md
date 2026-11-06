## ADDED Requirements

### Requirement: REQ-QRY-020 Cards before bodies
`bundle`, `context`, and `task start` SHALL print the card of each entry of class 0, 1, and 2 before the body of any block that is not requested. The card is the line `-- <id> | <file>:<line> | <status> | <reason>`. An entry whose body does not fit keeps its card, which then ends with `| body omitted`. A card that does not fit goes to `truncated:`. The print order does not change.

Refs: REQ-QRY-003, REQ-QRY-012, REQ-QRY-018

#### Scenario: SCN-QRY-020-1 Cards survive long bodies
- **WHEN** a task cites 5 requirements whose bodies fill the budget, and they have 3 code lines and 2 test lines
- **THEN** all 5 code and test lines print, and every cited requirement has its card

#### Scenario: SCN-QRY-020-2 Body omitted marker
- **WHEN** the body of a depth 1 requirement does not fit
- **THEN** its card ends with `| body omitted`, its body is absent, and its ID is not in `omitted`

#### Scenario: SCN-QRY-020-3 Many deltas
- **WHEN** the change of a task holds 14 delta requirements that cannot all fit at the default budget
- **THEN** the output holds 14 delta cards, and the trailer names none of them

#### Scenario: SCN-QRY-020-4 Card lost
- **WHEN** `context` runs with `--budget 0` on a task with depth 1 entries
- **THEN** the task block prints, the trailer names the depth 1 entries, and no card ends with the marker

#### Scenario: SCN-QRY-020-5 Everything fits
- **WHEN** every block fits in the budget
- **THEN** no card ends with the marker, and the output has no `truncated:` line

### Requirement: REQ-QRY-021 Task named paths
For a requested task at depth 1 or more, `bundle` SHALL print one class 1 card for each path in `paths` of the task. The reason is `named by <task>`. These cards print before the `implements` and `covers` lines. A path that is no file, or that already has a line in the output, prints no card. `related` of a file SHALL list only tasks of active changes as `mentions`.

Refs: REQ-QRY-006, REQ-QRY-012, REQ-IDX-009

#### Scenario: SCN-QRY-021-1 Named file
- **WHEN** a task line names `src/a.ts`, a file with no tag, and `context` runs on the task
- **THEN** the output holds the line `-- src/a.ts | src/a.ts | active | named by <task>`, before any `implements` line

#### Scenario: SCN-QRY-021-2 Missing path and duplicate
- **WHEN** a task line names `src/zz.ts`, which is no file, and a file that already has an `implements` line in the output
- **THEN** the output has no card for `src/zz.ts` and one line for the other file

#### Scenario: SCN-QRY-021-3 Archived task
- **WHEN** `context` runs on a task of an archived change whose line names an existing file
- **THEN** the output holds the `named by` card of that file

#### Scenario: SCN-QRY-021-4 Related of a file
- **WHEN** an archived task and an active task name `src/a.ts`, and `related src/a.ts` runs
- **THEN** the output lists only the active task, with the reason `mentions, in task line`

### Requirement: REQ-QRY-022 Uncited task label
When the index holds no requirement that a task cites, `bundle` and `context` SHALL start the output with the line `note: <task> cites no requirement. The blocks come from its change. Add a [REQ-...] citation.` The note is no block. It does not count toward the budget and is no entry of `omitted`.

Refs: REQ-QRY-016, REQ-QRY-015

#### Scenario: SCN-QRY-022-1 Uncited task
- **WHEN** a task line has no `[REQ-...]` citation, and `context` runs on it
- **THEN** the first line is the `note:` line with the task ID, and the blocks that follow are the deltas and designs of its change

#### Scenario: SCN-QRY-022-2 Cited task
- **WHEN** a task cites a requirement that the index holds
- **THEN** the output has no `note:` line

#### Scenario: SCN-QRY-022-3 Unknown citation
- **WHEN** a task cites only an ID that the index lacks
- **THEN** the first line is the `note:` line, and `omitted` does not list it

## MODIFIED Requirements

### Requirement: REQ-QRY-003 bundle
`specctx bundle <ID...> [--budget N] [--depth D] [--all]` SHALL print the canonical text of each named ID, its scenarios, the decisions that reference it, and related entries to depth D. Each block SHALL start with `-- <id> | <file>:<line> | <status> | <reason>`. Order: requested IDs, ADRs, decisions, REQs, tasks, code and test paths. It SHALL fit the blocks in N characters (default 8000), except REQ-QRY-018 blocks, and print `truncated: <count> entries omitted: <ids>` for entries with no card.

#### Scenario: SCN-QRY-003-1 Budget respected
- **WHEN** `specctx bundle REQ-APPLY-001 --budget 2000` runs
- **THEN** the output is at most 2000 characters plus the trailer lines, when every requested block fits

#### Scenario: SCN-QRY-003-2 Code paths only
- **WHEN** a bundle includes code entries
- **THEN** it prints their `file:line`, never file contents

#### Scenario: SCN-QRY-003-3 Canonical text
- **WHEN** a main spec and an archive copy differ for an ID
- **THEN** the bundle prints the main text

#### Scenario: SCN-QRY-003-4 Parity
- **WHEN** both engines run `bundle REQ-APPLY-001 --budget 3000` on the parity fixture
- **THEN** the outputs are byte-identical

### Requirement: REQ-QRY-012 Budget order
When a bundle passes its budget, `bundle` SHALL keep entries by class. Class 0 holds the requested IDs and the main version of each, which always stay. Class 1 holds code and test lines at depth 1. Class 2 holds ADRs, active decisions, requirements, capabilities, changes, and tasks at depth 1. Class 3 holds archived decisions and entries from depth 2. A decision that names a requested ID counts as depth 1. REQ-QRY-020 sets cards and bodies. The print order stays.

Refs: REQ-QRY-003, REQ-QRY-018

#### Scenario: SCN-QRY-012-1 Code and test lines first
- **WHEN** a requirement has 3 code lines, 2 test lines, and neighbors that fill the budget
- **THEN** all 5 lines are in the output, and each neighbor requirement or task prints its card or is in the omitted list

#### Scenario: SCN-QRY-012-2 This repository
- **WHEN** `bundle REQ-LOOP-001` runs at the default budget on a temp copy of this repository
- **THEN** every code and test line that tags REQ-LOOP-001 in the index of the copy is in the output. The test never reads or writes the real `.ctx/index.json`.

#### Scenario: SCN-QRY-012-3 Decisions for a requested ID
- **WHEN** an active and an archived decision both name a requested requirement, and the budget fits one
- **THEN** the active decision stays and the archived decision is in the omitted list

### Requirement: REQ-QRY-014 Omitted trailer
The `truncated:` trailer of `bundle` SHALL list the IDs that lost their card, in print order, not in class order. An entry that kept its card with `| body omitted` is not in it. It SHALL never list a requested ID, because the blocks of REQ-QRY-018 always print.

Refs: REQ-QRY-003, REQ-QRY-012, REQ-QRY-018

#### Scenario: SCN-QRY-014-1 Print order
- **WHEN** a bundle drops the cards of a task and a requirement that sit in different classes
- **THEN** the trailer lists the requirement before the task, as the blocks print

#### Scenario: SCN-QRY-014-2 Requested ID never omitted
- **WHEN** a delta modifies a requested requirement, and the delta block and the main version are each longer than the budget
- **THEN** both blocks print, and the trailer does not list the requested ID

#### Scenario: SCN-QRY-014-3 Requested decision
- **WHEN** `bundle` runs for a decision and for a requirement that the decision names
- **THEN** the decision block prints once, with the reason `requested`

### Requirement: REQ-QRY-019 Completeness fields
`bundle --json` and `context --json` SHALL print `text`, `omitted`, `body_omitted`, `chars`, `budget`, and `complete`. `chars` is the length of `text` in code points. `body_omitted` lists the IDs with the `| body omitted` marker. `complete` is true only when `omitted` and `body_omitted` are empty. With `--block`, `budget` is null, `complete` is true, and both lists are empty. `task start --json` SHALL hold the same fields in `bundle`.

Refs: REQ-QRY-003, REQ-QRY-015, REQ-QRY-018

#### Scenario: SCN-QRY-019-1 Fields
- **WHEN** `bundle REQ-TH-001 --json` runs three times. The first budget drops a block. The second fits all blocks. The third run is on a lone requirement that is longer than the budget.
- **THEN** in each run `chars` equals the code point length of `text` and `budget` equals the flag. `complete` is false in the first run, true in the second, and true in the third, where `chars` is greater than `budget`.

#### Scenario: SCN-QRY-019-2 Block mode
- **WHEN** `bundle REQ-TH-001 --block --json` runs
- **THEN** `budget` is null, `complete` is true, `omitted` and `body_omitted` are empty, and `chars` equals the code point length of `text`

#### Scenario: SCN-QRY-019-3 Task start
- **WHEN** `task start <task> --json` runs
- **THEN** its `bundle` object holds `chars`, `budget`, and `complete` with the same rules
