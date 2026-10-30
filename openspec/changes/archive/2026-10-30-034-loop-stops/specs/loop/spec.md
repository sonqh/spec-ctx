## ADDED Requirements

### Requirement: REQ-LOOP-009 Plan stop in next
Take a change with planning complete, no `[x]` task, no current task, and no question with `stage: plan`, open or resolved. `next` SHALL return `ask` with `human: true`, state `plan_stop`, and the command `specctx handoff ask --change <c> "plan ready for <c>. Approve to start the tasks?"`. `<c>` is the folder name. The rule comes after the citation rule. No config switch.

Refs: REQ-LOOP-005, REQ-LOOP-007, ADR-006

#### Scenario: SCN-LOOP-009-1 Plan question due
- **WHEN** planning of `002-ids` is complete, every task has a citation, and the change has no question
- **THEN** `next --json` prints `action: ask`, `human: true`, `state: plan_stop`, `task: null`, and the command `specctx handoff ask --change 002-ids "plan ready for 002-ids. Approve to start the tasks?"`

#### Scenario: SCN-LOOP-009-2 The printed command ends the rule
- **WHEN** the command of SCN-LOOP-009-1 runs, then `handoff resolve <n> "yes"` runs
- **THEN** `next --json` prints `ask` with `question_open` while the question is open, and `start` for the first open task after the resolve

#### Scenario: SCN-LOOP-009-3 No stop after the start
- **WHEN** a task of `002-ids` has `[x]`, or a current task of the change exists, or a resolved question has `stage: plan`
- **THEN** `next --json` does not print `state: plan_stop`

### Requirement: REQ-LOOP-010 Stale tasks named under a current task
When a current task makes `next` return `work`, `fix`, or the attempt cap `ask`, and `[x]` tasks have stale evidence, `reason` SHALL end with `stale waiting: <t>, <t>`. A fail reason comes first, then a period and a space. `action`, `task`, `tasks`, and `command` SHALL not change.

Refs: REQ-LOOP-008, REQ-LOOP-006

#### Scenario: SCN-LOOP-010-1 Work names the stale tasks
- **WHEN** tasks 1.1 and 1.2 of `002-ids` have stale evidence and task 2.1 is current with no fail file
- **THEN** `next --json` prints `action: work`, `task: 002/2.1`, `tasks: ["002/2.1"]`, and the reason `stale waiting: 002/1.1, 002/1.2`

#### Scenario: SCN-LOOP-010-2 Fix keeps its reason first
- **WHEN** task 1.1 has stale evidence and task 2.1 is current with a failed Verify that ends in `FAIL two`
- **THEN** the reason is `Verify failed (exit 1): FAIL two. stale waiting: 002/1.1`
