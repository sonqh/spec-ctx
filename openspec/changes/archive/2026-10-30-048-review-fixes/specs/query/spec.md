## MODIFIED Requirements

### Requirement: REQ-QRY-016 Task reach
For a requested task at depth 1 or more, `bundle` SHALL put the requirements that the task cites, and their main versions, in class 0. It SHALL put the code and test lines of those requirements in class 1, with the reasons `implements <REQ>` and `covers <REQ>`. It SHALL keep the decisions that name those requirements, and those that name a requested ID, at depth 1 at every depth. A task that cites no requirement gets no change from this rule.

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
- **WHEN** a decision names a cited requirement, and the change has deltas that fill the budget, at `--depth 1` and at `--depth 2`
- **THEN** both outputs hold the decision block with the reason `decision for <REQ>`, in the same budget class

#### Scenario: SCN-QRY-016-5 Two requested IDs
- **WHEN** `bundle` runs for two requirements at `--depth 2`, and the decision of the second is reachable from the first, and deltas fill the budget
- **THEN** the decision of the second holds the reason `decision for <REQ>` and the same budget class as at `--depth 1`
