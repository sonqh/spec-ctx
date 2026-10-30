## ADDED Requirements

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
