## ADDED Requirements

### Requirement: REQ-QRY-015 Context command
`specctx context <input>` SHALL answer what an agent needs before it edits. The input is one task, ID, file, or change, resolved as `bundle` resolves it. The output SHALL equal the output of `bundle` for that input, with the same blocks, reasons, budget classes, and trailer. `context` SHALL reuse the walk of REQ-QRY-002 and the budget of REQ-QRY-012. It takes `--budget`, `--depth`, and `--json`. No input, or more than one, exits 2.

Refs: REQ-QRY-003, REQ-QRY-005, REQ-QRY-011, REQ-QRY-012

#### Scenario: SCN-QRY-015-1 Four kinds of input
- **WHEN** `context` runs on a task, a requirement, a file, and a change in turn
- **THEN** each output equals the output of `bundle` for the same input, and `--json` has the same `text` and `omitted`

#### Scenario: SCN-QRY-015-2 One input only
- **WHEN** `context` runs with no input, and then with two inputs
- **THEN** both runs exit 2 and print a usage line, and neither prints a block

#### Scenario: SCN-QRY-015-3 Unknown input
- **WHEN** `context REQ-NOPE-001` runs and no such ID or file exists
- **THEN** it exits 2 and stderr names the input, as `bundle` does

### Requirement: REQ-QRY-016 Task reach
For a requested task at depth 1 or more, `bundle` SHALL put the requirements that the task cites, and their main versions, in class 0. It SHALL put the code and test lines of those requirements in class 1, with the reasons `implements <REQ>` and `covers <REQ>`. It SHALL keep the decisions that name those requirements. A task that cites no requirement gets no change from this rule.

Refs: REQ-QRY-003, REQ-QRY-012

#### Scenario: SCN-QRY-016-1 Cited requirement and its lines first
- **WHEN** a task cites a requirement with 3 code lines and 2 test lines, and its change has deltas that fill the budget
- **THEN** the requirement block and all 5 lines are in the output, and the omitted IDs are deltas or tasks

#### Scenario: SCN-QRY-016-2 This repository
- **WHEN** `bundle 045/2.1` runs at the default budget on a temp copy of this repository
- **THEN** the output holds every code and test line that tags REQ-QRY-006 in the index of the copy. The test never reads or writes the real `.ctx/index.json`.

#### Scenario: SCN-QRY-016-3 A task with no citation
- **WHEN** a task cites no requirement and `bundle` runs on it
- **THEN** the output holds the task, its deltas, and its designs, and no code or test line

#### Scenario: SCN-QRY-016-4 Decision blocks stay
- **WHEN** a decision names a cited requirement, and the change has deltas that fill the budget
- **THEN** the output holds the decision block with the reason `decision for <REQ>`

### Requirement: REQ-QRY-017 File reach
For a requested file at depth 1 or more, `bundle` SHALL put the code and test lines of its tagged requirements into class 1. Their reasons are `implements <REQ>` and `covers <REQ>`. A requirement that only a task line names adds no lines. The answer of `related` for a file does not change.

Refs: REQ-QRY-005, REQ-QRY-012

#### Scenario: SCN-QRY-017-1 A file and its own tests
- **WHEN** `src/a.ts` tags REQ-AB-001, and `tests/a.test.ts` covers it, and `bundle src/a.ts` runs
- **THEN** the output holds the lines `src/a.ts:1` and `tests/a.test.ts:1` with the reasons `implements REQ-AB-001` and `covers REQ-AB-001`

#### Scenario: SCN-QRY-017-2 This repository
- **WHEN** `context src/graph/files.ts` runs at the default budget on a temp copy of this repository
- **THEN** the output holds every code and test line that tags the requirements that the file tags, in the index of the copy

#### Scenario: SCN-QRY-017-3 A task mention adds no lines
- **WHEN** a file has no tag and an active task line names its path, and `bundle` runs on it
- **THEN** the output holds the task and no code or test line, and `related` of the file lists no code or test entry

## MODIFIED Requirements

### Requirement: REQ-QRY-005 Lookup by file
`specctx related <path>` and `specctx bundle <path>` SHALL accept a file where they accept an ID. The path is relative to the root, or any path that resolves inside it. The answer SHALL list the requirements, scenarios, tasks, and decisions linked to the file, in the format of REQ-QRY-002. `related` SHALL list no code and no test entry. `bundle` follows REQ-QRY-017. `--depth` counts from the entries that the file links to. An ID wins over a path of the same text.

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
