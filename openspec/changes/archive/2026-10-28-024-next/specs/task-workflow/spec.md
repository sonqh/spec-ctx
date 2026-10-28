# task-workflow (delta)

## MODIFIED Requirements

### Requirement: REQ-TASK-003 Done
`specctx task done <id>` SHALL run the Verify command. Exit 0 writes `.ctx/evidence/<change>/<task>.json` and sets `[x]` on that line. A non zero exit writes a fail file (REQ-LOOP-002), prints the output tail, then `Verify failed (exit <n>). The task stays open.`, and exits 1. `--manual` SHALL be required without a Verify command and refused with one. A `[x]` task with no evidence gets the same run. A Verify command that differs from `current.json` exits 2.

Refs: ADR-004, ADR-006, REQ-VER-001

#### Scenario: SCN-TASK-003-1 Passing verify
- **WHEN** the Verify command exits 0
- **THEN** the task line is `[x]`, the evidence file exists, and the rest of `tasks.md` is byte-identical

#### Scenario: SCN-TASK-003-2 Failing verify
- **WHEN** the Verify command exits 1
- **THEN** `tasks.md` is unchanged, no evidence file exists, the last line is `Verify failed (exit 1). The task stays open.`, and `task done` exits 1

#### Scenario: SCN-TASK-003-3 Manual evidence
- **WHEN** the task has prose Verify and `--manual "reviewed output by eye"` is given
- **THEN** the evidence has `kind: manual` and the note

#### Scenario: SCN-TASK-003-4 Manual required
- **WHEN** the task has prose Verify and no `--manual`
- **THEN** it exits 2 and says a `--manual` note is required

#### Scenario: SCN-TASK-003-5 Manual refused on a Verify command
- **WHEN** the task line has Verify: `echo ok` and `task done 002/2.1 --manual "seen"` runs
- **THEN** it exits 2 with `task 002/2.1 has a Verify command. Run it with specctx task done 002/2.1.`, writes no evidence, and the box stays as it is

#### Scenario: SCN-TASK-003-6 Repair of a hand tick
- **WHEN** the task is `[x]` with no evidence file and `task done` runs
- **THEN** a Verify exit 0 writes the evidence and keeps `[x]`. A Verify exit 1 prints `Verify failed (exit 1). The task stays open.` and keeps `[x]` with no evidence. A `[x]` task with evidence exits 2 with `task 002/2.1 is done`

#### Scenario: SCN-TASK-003-7 Verify changed since start
- **WHEN** `task start 002/2.1` ran, the Verify code span on the task line changed, and `task done 002/2.1` runs
- **THEN** it exits 2 with `task 002/2.1: the Verify command changed since task start. Run specctx task start 002/2.1 again.`, runs nothing, and the same edit with `current.json` naming another task runs the command

#### Scenario: SCN-TASK-003-8 Fail file on a failed run
- **WHEN** the Verify command of `002/2.2` exits 1 twice after `task start 002/2.2`
- **THEN** `.ctx/evidence/002/2.2.fail-1.json` and `2.2.fail-2.json` exist with `attempt` 1 and 2, the box stays `[ ]`, `check --strict` reports no finding on either file, and `--json` prints `attempt`, `fail`, and `question: null`

#### Scenario: SCN-TASK-003-9 Question at the cap
- **WHEN** the failure count reaches `[loop] max_attempts`
- **THEN** `.ctx/questions.json` has an open question with the task ID, the output ends with `blocked: question <k> written. Run specctx handoff resolve <k> "<answer>" to continue.`, `--json` prints `question: <k>`, and the exit code is 1
