# Spec Delta

## ADDED Requirements

### Requirement: REQ-QRY-018 Requested blocks stay
`bundle`, `context`, and `task start` SHALL print each block with the reason `requested`, and the main version of each requested ID, also when it passes the budget. These blocks count toward the budget. Other blocks keep the classes of REQ-QRY-012. When the kept blocks pass the budget, the output SHALL end with `over budget: <used> of <budget> characters`, after the `truncated:` line. A negative budget SHALL exit 2.

Refs: REQ-QRY-003, REQ-QRY-012, REQ-QRY-014

#### Scenario: SCN-QRY-018-1 Requested block longer than the budget
- **WHEN** a spec holds one REQ-TEST-001 that is longer than 100 characters, and `context REQ-TEST-001 --budget 100` runs
- **THEN** the output holds the REQ-TEST-001 block and the `over budget:` line, it exits 0, and `omitted` does not hold REQ-TEST-001

#### Scenario: SCN-QRY-018-2 Several requested IDs
- **WHEN** `bundle` runs for two requirements, and each block is longer than the budget
- **THEN** both blocks print in the order of the input

#### Scenario: SCN-QRY-018-3 Task line
- **WHEN** a task line is longer than the budget, and `task start` runs on that task
- **THEN** the output holds the task line

#### Scenario: SCN-QRY-018-4 Over budget line
- **WHEN** the kept blocks pass the budget, and other blocks drop
- **THEN** the `truncated:` line comes first, the last line is `over budget: <used> of <budget> characters`, and `<used>` is the length of the kept blocks in code points, without the trailer lines

#### Scenario: SCN-QRY-018-5 All blocks fit
- **WHEN** every block fits in the budget
- **THEN** the output has no `over budget:` line and no `truncated:` line

#### Scenario: SCN-QRY-018-6 Zero and negative budget
- **WHEN** `bundle REQ-TH-001 --budget 0` runs, and then `bundle REQ-TH-001 --budget -1`
- **THEN** the first run prints the requested block, the `truncated:` line, and the `over budget:` line, and exits 0. The second run exits 2 and prints no block.

### Requirement: REQ-QRY-019 Completeness fields
`bundle --json` and `context --json` SHALL print `text`, `omitted`, `chars`, `budget`, and `complete`. `chars` is the length of `text` in code points. `budget` is the budget in force. `complete` is true only when `omitted` is empty. It says that no block dropped, not that the text fits. With `--block`, `budget` is null and `complete` is true. `task start --json` SHALL hold the same fields in `bundle`.

Refs: REQ-QRY-003, REQ-QRY-015, REQ-QRY-018

#### Scenario: SCN-QRY-019-1 Fields
- **WHEN** `bundle REQ-TH-001 --json` runs three times. The first budget drops a block. The second fits all blocks. The third run is on a lone requirement that is longer than the budget.
- **THEN** in each run `chars` equals the code point length of `text` and `budget` equals the flag. `complete` is false in the first run, true in the second, and true in the third, where `chars` is greater than `budget`.

#### Scenario: SCN-QRY-019-2 Block mode
- **WHEN** `bundle REQ-TH-001 --block --json` runs
- **THEN** `budget` is null, `complete` is true, `omitted` is empty, and `chars` equals the code point length of `text`

#### Scenario: SCN-QRY-019-3 Task start
- **WHEN** `task start <task> --json` runs
- **THEN** its `bundle` object holds `chars`, `budget`, and `complete` with the same rules

## MODIFIED Requirements

### Requirement: REQ-QRY-003 bundle
`specctx bundle <ID...> [--budget N] [--depth D] [--all]` SHALL print the canonical text of each named ID, its scenarios, the decisions that reference it, and related entries to depth D. Each block SHALL start with `-- <id> | <file>:<line> | <status> | <reason>`. Order: requested IDs, ADRs, decisions, related REQs, tasks, code and test paths. It SHALL fit the blocks in N characters (default 8000), except the blocks of REQ-QRY-018, and print `truncated: <count> entries omitted: <ids>`.

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
When a bundle passes its budget, `bundle` SHALL keep entries by class. Class 0 holds the requested IDs and the main version of each, which always stay. Class 1 holds code and test lines at depth 1. Class 2 holds ADRs, active decisions, requirements, capabilities, changes, and tasks at depth 1. Class 3 holds archived decisions and entries from depth 2. A decision that names a requested ID counts as depth 1. The print order of REQ-QRY-003 does not change.

Refs: REQ-QRY-003, REQ-QRY-018

#### Scenario: SCN-QRY-012-1 Code and test lines first
- **WHEN** a requirement has 3 code lines, 2 test lines, and neighbors that fill the budget
- **THEN** all 5 lines are in the output and the omitted IDs are neighbor requirements or tasks

#### Scenario: SCN-QRY-012-2 This repository
- **WHEN** `bundle REQ-LOOP-001` runs at the default budget on a temp copy of this repository
- **THEN** every code and test line that tags REQ-LOOP-001 in the index of the copy is in the output. The test never reads or writes the real `.ctx/index.json`.

#### Scenario: SCN-QRY-012-3 Decisions for a requested ID
- **WHEN** an active and an archived decision both name a requested requirement, and the budget fits one
- **THEN** the active decision stays and the archived decision is in the omitted list

### Requirement: REQ-QRY-014 Omitted trailer
The `truncated:` trailer of `bundle` SHALL list the omitted IDs in print order, not in class order. It SHALL never list a requested ID, because the blocks of REQ-QRY-018 always print.

Refs: REQ-QRY-003, REQ-QRY-012, REQ-QRY-018

#### Scenario: SCN-QRY-014-1 Print order
- **WHEN** a bundle omits a task and a requirement that sit in different classes
- **THEN** the trailer lists the requirement before the task, as the blocks print

#### Scenario: SCN-QRY-014-2 Requested ID never omitted
- **WHEN** a delta modifies a requested requirement, and the delta block and the main version are each longer than the budget
- **THEN** both blocks print, and the trailer does not list the requested ID

#### Scenario: SCN-QRY-014-3 Requested decision
- **WHEN** `bundle` runs for a decision and for a requirement that the decision names
- **THEN** the decision block prints once, with the reason `requested`

### Requirement: REQ-QRY-015 Context command
`specctx context <input>` SHALL answer what an agent needs before it edits. The input is one task, ID, file, or change, resolved as `bundle` resolves it. The output SHALL equal the output of `bundle` for that input, with the same blocks, reasons, budget classes, and trailer. `context` SHALL reuse the walk of REQ-QRY-002 and the budget of REQ-QRY-012. It takes `--budget`, `--depth`, and `--json`. No input, or more than one, exits 2.

Refs: REQ-QRY-003, REQ-QRY-005, REQ-QRY-011, REQ-QRY-012

#### Scenario: SCN-QRY-015-1 Four kinds of input
- **WHEN** `context` runs on a task, a requirement, a file, and a change in turn
- **THEN** each output equals the output of `bundle` for the same input, and `--json` has the same `text`, `omitted`, `chars`, `budget`, and `complete`

#### Scenario: SCN-QRY-015-2 One input only
- **WHEN** `context` runs with no input, and then with two inputs
- **THEN** both runs exit 2 and print a usage line, and neither prints a block

#### Scenario: SCN-QRY-015-3 Unknown input
- **WHEN** `context REQ-NOPE-001` runs and no such ID or file exists
- **THEN** it exits 2 and stderr names the input, as `bundle` does
