# task-workflow Specification

## Purpose
Three commands own the task checkbox and the evidence behind it.

## Requirements

### Requirement: REQ-TASK-001 Next task
`specctx task next [--change <name>]` SHALL pick the lowest numbered active change. In it, it SHALL pick the first open task whose earlier tasks in the same group are done. It SHALL print `<id>  <text>`, then the REQ IDs the task cites, then its Verify command. With no open task it SHALL print `no open task. Every task in the active changes is done. Next: archive <change>.` and exit 1. `--json` SHALL include `id`, `text`, `reqs`, `verify`, `bundle_command`.

#### Scenario: SCN-TASK-001-1 Order within a group
- **WHEN** tasks 2.1 is open and 2.2 is open
- **THEN** `task next` prints 2.1

#### Scenario: SCN-TASK-001-2 Skip done
- **WHEN** 1.1 and 1.2 are done and 1.3 is open
- **THEN** `task next` prints 1.3

#### Scenario: SCN-TASK-001-3 Nothing open
- **WHEN** every task in the active change `009-x` is done
- **THEN** it prints `no open task. Every task in the active changes is done. Next: archive 009-x.` and exits 1

### Requirement: REQ-TASK-002 Start
`specctx task start <id>` SHALL print the bundle for the REQ IDs the task cites, within the budget. A task with no REQ gets one hint line that names `specctx query --change --kind req`. Then one footer `-- bundle <n> chars, <p>% of <m> chars of spec text`. `<m>` counts canonical REQ, SCN, and decision text. It SHALL write `.ctx/current.json` with the task id, start time, and Verify command. Exit 2 if the task is done or missing. `bundle` prints no footer.

Refs: REQ-QRY-003, REQ-STAT-002

#### Scenario: SCN-TASK-002-1 Start prints the bundle
- **WHEN** `task start 002/2.1` runs and the task cites `[REQ-TASK-001]`
- **THEN** stdout starts with `-- REQ-TASK-001 |` and `.ctx/current.json` names `002/2.1`

#### Scenario: SCN-TASK-002-2 Already done
- **WHEN** the task is `[x]`
- **THEN** it exits 2 and prints `task 002/2.1 is done`

#### Scenario: SCN-TASK-002-3 Footer
- **WHEN** `task start` runs on the fixture task `add-mfa/1.3`
- **THEN** the last line matches `^-- bundle \d+ chars, \d+(\.\d)?% of \d+ chars of spec text$` and `specctx bundle REQ-UA-004` prints no such line

#### Scenario: SCN-TASK-002-4 No REQ gives a hint
- **WHEN** `task start add-mfa/1.3` runs on the no-ID fixture after `adopt` and the task line cites no REQ
- **THEN** stdout has two lines: `task add-mfa/1.3 cites no REQ. Run specctx query --change add-mfa --kind req to list its requirements, then add [REQ-<CAP>-NNN] to the task line.` and the footer with `bundle 0 chars`

#### Scenario: SCN-TASK-002-5 The Verify command is frozen
- **WHEN** `task start 002/2.1` runs and the task line has Verify: `true`
- **THEN** `.ctx/current.json` holds `"verify": "true"` beside `bundle_chars`, `started_at`, and `task`, and a task with no Verify code span gets `"verify": null`

### Requirement: REQ-TASK-003 Done
`specctx task done <id>` SHALL run the Verify command of the task. Exit 0 writes `.ctx/evidence/<change>/<task>.json` and sets `[x]` on that line only. A non zero exit writes nothing, prints the last 20 lines of output, then `Verify failed (exit <n>). The task stays open.`, and exits 1. `--manual` SHALL be required without a Verify command and refused with one. A `[x]` task with no evidence gets the same run. A Verify command that differs from `current.json` exits 2.

Refs: ADR-004, REQ-VER-001

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

### Requirement: REQ-TASK-004 Evidence shape
Each evidence file SHALL be JSON with sorted keys: `task`, `reqs`, `kind`, `verify`, `files`, `at` (ISO 8601 UTC), `tool_version`. `verify` SHALL hold `command`, `exit`, `stdout_sha256`, and `stderr_tail` of at most 20 lines. `files` SHALL map each code and test file tagged with a cited REQ to its sha256. Two runs with the same inputs SHALL differ only in `at`.

Refs: ADR-004

#### Scenario: SCN-TASK-004-1 Files digested
- **WHEN** `src/a.ts` carries `// REQ-TASK-001` and the task cites it
- **THEN** evidence `files` has `src/a.ts` with its sha256

### Requirement: REQ-TASK-005 Reopen
`specctx task reopen <id> "<reason>"` SHALL change `[x]` to `[ ]`, move the evidence file to `.ctx/evidence/<change>/<task>.reopened-<n>.json`, and append the reason to `.ctx/handoff.md` under `reopened`.

#### Scenario: SCN-TASK-005-1 Reopen after spec change
- **WHEN** `task reopen 005/1.1 "REQ-APPLY-002 changed"` runs
- **THEN** the task is open, the old evidence is kept under the new name, and the handoff lists the reason
