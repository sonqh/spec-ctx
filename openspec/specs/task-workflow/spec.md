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
`specctx task start <id>` SHALL print what `specctx context <id>` prints for the task. A task with no REQ gets one hint line that names `specctx query --change --kind req`. Then one footer `-- bundle <n> chars, <p>% of <m> chars of spec text`. `<m>` counts canonical REQ, SCN, and decision text. It SHALL write `.ctx/current.json` with the task id, start time, and Verify command. A done or missing task exits 2. `bundle` prints no footer.

Refs: REQ-QRY-003, REQ-STAT-002

#### Scenario: SCN-TASK-002-1 Start prints the bundle
- **WHEN** `task start 002/2.1` runs and the task cites `[REQ-TASK-001]`
- **THEN** stdout starts with the same blocks as `context 002/2.1`, holds `-- REQ-TASK-001 |`, and `.ctx/current.json` names `002/2.1`

#### Scenario: SCN-TASK-002-2 Already done
- **WHEN** the task is `[x]`
- **THEN** it exits 2 and prints `task 002/2.1 is done`

#### Scenario: SCN-TASK-002-3 Footer
- **WHEN** `task start` runs on the fixture task `add-mfa/1.3`
- **THEN** the last line matches `^-- bundle \d+ chars, \d+(\.\d)?% of \d+ chars of spec text$` and `specctx bundle REQ-UA-004` prints no such line

#### Scenario: SCN-TASK-002-4 No REQ gives a hint
- **WHEN** `task start add-mfa/1.3` runs on the no-ID fixture after `adopt` and the task line cites no REQ
- **THEN** stdout has the blocks of `context add-mfa/1.3`, then the line `task add-mfa/1.3 cites no REQ. Run specctx query --change add-mfa --kind req to list its requirements, then add [REQ-<CAP>-NNN] to the task line.`, then the footer

#### Scenario: SCN-TASK-002-5 The Verify command is frozen
- **WHEN** `task start 002/2.1` runs and the task line has Verify: `true`
- **THEN** `.ctx/current.json` holds `"verify": "true"` beside `bundle_chars`, `started_at`, and `task`, and a task with no Verify code span gets `"verify": null`

#### Scenario: SCN-TASK-002-6 Shared task number
- **WHEN** an active task and an archived task share one ID, and `task start` runs on it
- **THEN** the output reflects the refs of the active task, and `context` for the same ID prints the same blocks

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

### Requirement: REQ-TASK-004 Evidence shape
Each evidence file SHALL be JSON with sorted keys: `task`, `reqs`, `kind`, `verify`, `files`, `diff`, `at` (ISO 8601 UTC), `tool_version`. `verify` SHALL hold `command`, `exit`, `stdout_sha256`, and `stderr_tail` (20 lines at most). `files` SHALL map to its sha256 each existing file that the task line or its Verify command names, and each REQ-TASK-009 file. `diff` SHALL list the REQ-TASK-009 paths, sorted. A tag alone SHALL not add a file. Equal inputs SHALL differ only in `at`.

Refs: ADR-004

#### Scenario: SCN-TASK-004-1 Files digested
- **WHEN** the task line names `src/a.ts` in backticks and the file exists
- **THEN** evidence `files` has `src/a.ts` with its sha256

#### Scenario: SCN-TASK-004-2 Tag alone
- **WHEN** a task cites REQ-TASK-001, `src/a.ts` carries its tag, and neither the task line nor Verify names the file
- **THEN** evidence `files` does not hold `src/a.ts`, and a later edit of `src/a.ts` leaves the task fresh

### Requirement: REQ-TASK-005 Reopen
`specctx task reopen <id> "<reason>"` SHALL change `[x]` to `[ ]`, move the evidence file to `.ctx/evidence/<change>/<task>.reopened-<n>.json`, and append the reason to `.ctx/handoff.md` under `reopened`.

#### Scenario: SCN-TASK-005-1 Reopen after spec change
- **WHEN** `task reopen 005/1.1 "REQ-APPLY-002 changed"` runs
- **THEN** the task is open, the old evidence is kept under the new name, and the handoff lists the reason

### Requirement: REQ-TASK-007 Next command
`specctx task next --json` SHALL set `bundle_command` to the `context` command for the task, with the run prefix and the budget of the config. It names the answer that `task start` prints.

Refs: REQ-TASK-001, REQ-TASK-002, REQ-QRY-015

#### Scenario: SCN-TASK-007-1 Context command
- **WHEN** `task next --json` runs and the next task is `002/2.1`
- **THEN** `bundle_command` starts with `context 002/2.1`, behind the run prefix

### Requirement: REQ-TASK-008 No machine paths in evidence
`task done` SHALL replace the project root and its real path with `.` and the home directory with `~`. This applies to `verify.stderr_tail` of evidence, `stderr_tail` of a fail file, and the cap question. The longest path SHALL go first. A match SHALL need a start of text or a character other than a letter, digit, `.`, `_`, or `-` before it. `verify.command` and printed output SHALL not change.

Refs: REQ-TASK-004, REQ-LOOP-002, REQ-VER-006

#### Scenario: SCN-TASK-008-1 Root and home redacted
- **WHEN** the project root is `<r>`, `HOME` is `<h>` outside it, and a passing Verify writes `<r>/a.ts` and `<h>/x` to stderr
- **THEN** `verify.stderr_tail` is `./a.ts` and `~/x` on two lines, `verify.command` equals the task line command, and the printed output keeps the full paths

#### Scenario: SCN-TASK-008-2 Fail file and cap question redacted
- **WHEN** a failing Verify writes `FAIL <r>/a.test.ts` three times in a row
- **THEN** each fail file holds `FAIL ./a.test.ts`, and the cap question reads `Last: FAIL ./a.test.ts.`

### Requirement: REQ-TASK-009 Diff base at task start
`task start` SHALL write `base` into `.ctx/current.json`: the git HEAD and the sha256 of each changed or untracked file. `task done` SHALL add each file whose digest differs from `base` or that `base` lacks. Ignored files, `.ctx/`, `.claude/`, and any `tasks.md` stay out. With no git, no `base`, or a `base` of another task, it adds none (REQ-TASK-010) and prints one stderr note with the cause: `no git repo`, `no task start`, or `base lost`.

Refs: REQ-TASK-002, REQ-TASK-004

#### Scenario: SCN-TASK-009-1 File touched since start
- **WHEN** `task start` runs in a git repo, a later edit changes `src/b.ts` and adds the untracked `src/c.ts`, and `task done` runs
- **THEN** evidence `files` holds `src/b.ts` and `src/c.ts` and holds no file that was already changed at start with the same digest

#### Scenario: SCN-TASK-009-2 No git or no base
- **WHEN** the project is not a git repo, or `task done` runs with no `task start` for that task
- **THEN** `files` holds only the named and Verify files, and stderr has one note that names the cause

### Requirement: REQ-TASK-010 Carry the diff on repair
When `task done` has no matching `base` and a `reopened-*` copy of the task holds a `diff` field, `task done` SHALL carry those paths into `files` and `diff`. It keeps only paths that still exist and pass the filters of REQ-TASK-009. Evidence with no `diff` field carries nothing. The note still prints when no path is carried.

Refs: REQ-TASK-009, REQ-TASK-005

#### Scenario: SCN-TASK-010-1 Reopen then done
- **WHEN** a task closed with `diff` of `src/b.ts`, then `task reopen` and `task done` run with no `task start`
- **THEN** the new evidence holds `src/b.ts` in `files` and `diff`, and a reopened copy with no `diff` field carries nothing
