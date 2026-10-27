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
`specctx task start <id>` SHALL print the bundle for the REQ IDs the task cites, within the budget. A task with no REQ gets one hint line: run `specctx query --change --kind req`, then add `[REQ-<CAP>-NNN]`. Then one footer `-- bundle <n> chars, <p>% of <m> chars of spec text`. `<m>` counts all canonical REQ, SCN, and decision text. It SHALL write `.ctx/current.json` with the task id and start time. Exit 2 if the task is done or missing. `bundle` prints no footer.

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

### Requirement: REQ-TASK-003 Done
`specctx task done <id>` SHALL parse the task's Verify command, run it in the project root, and on exit 0 write `.ctx/evidence/<change>/<task>.json` and change `[ ]` to `[x]` on that task line only. On a non-zero exit it SHALL write nothing, print the last 20 lines of output, then `Verify failed (exit <n>). The task stays open.`, and exit 1. `--manual "<note>"` SHALL be required when the task has no Verify command.

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

### Requirement: REQ-TASK-006 Backfill
`specctx task backfill --manual "<note>" [--change <name>]` SHALL write manual evidence for every `[x]` task that has no evidence file, in active changes only, through the same path as `task done --manual`. It SHALL skip archived changes, print the count per change, and SHALL not touch tasks that already have evidence.

Refs: REQ-TASK-003, ADR-004

#### Scenario: SCN-TASK-006-1 Count per change
- **WHEN** two active changes have 5 and 7 ticked tasks without evidence
- **THEN** `task backfill --manual adopted` writes 12 files and prints both counts

#### Scenario: SCN-TASK-006-2 Existing evidence kept
- **WHEN** a task already has command evidence
- **THEN** `backfill` leaves its file byte-identical

#### Scenario: SCN-TASK-006-3 Archived changes skipped
- **WHEN** one active change has 2 ticked tasks without evidence and one archived change has 3
- **THEN** `task backfill --manual adopted` prints `backfilled 2 task(s)`, names only the active change, and writes no file under `.ctx/evidence/` for the archived one
