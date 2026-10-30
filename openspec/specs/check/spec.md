# check Specification

## Purpose
`check` is the integrity gate. It runs in the pre-commit hook and in CI.

## Requirements

### Requirement: REQ-CHK-001 Base rules
`specctx check` SHALL report: `missing-id`, `scenario-id-mismatch`, `bad-ref`, `task-without-req`, `task-without-verify`, `duplicate-id`, `reused-id` (the first ID of a retired row), `dangling-ref`, `req-without-scn`, `code-tag-no-canonical`, `unknown-cap`, `retitle-needs-renamed` (a delta ID in main with another title and no RENAMED TO line). `missing-id` and `req-without-scn` skip archived entries. A finding prints `file:line  rule  id`. Exit 1 on a finding, else `0 findings`.

Refs: ADR-002

#### Scenario: SCN-CHK-001-1 Dangling ref
- **WHEN** a spec says `Refs: REQ-NOPE-001`
- **THEN** `check` exits 1 and prints the file, line, and `dangling-ref REQ-NOPE-001`

#### Scenario: SCN-CHK-001-2 Modified is not duplicate
- **WHEN** an active change holds a MODIFIED block for an ID that also exists in `openspec/specs/`
- **THEN** `check` reports no `duplicate-id` for it

#### Scenario: SCN-CHK-001-3 Unknown capability code
- **WHEN** a spec defines `REQ-ZZZ-001` and `ZZZ` is not in config
- **THEN** `check` reports `unknown-cap REQ-ZZZ-001`

#### Scenario: SCN-CHK-001-4 Replacement ID in a retire reason
- **WHEN** a retired row reads `| REQ-CTX-008 | 2026-10-24 | moved to spec-ctx REQ-CLI-001 |`
- **THEN** `check` reports no `reused-id` for `REQ-CLI-001`

#### Scenario: SCN-CHK-001-5 Archived REMOVED block
- **WHEN** an archived change holds a `## REMOVED` block whose requirement has no scenario
- **THEN** `check` reports no `req-without-scn` for it

#### Scenario: SCN-CHK-001-6 Archived header without an ID
- **WHEN** an archived change holds `### Requirement: Old header` and `#### Scenario: Old case` with no ID
- **THEN** `check` reports no `missing-id` for either line and `adopt --dry-run` does not list them

#### Scenario: SCN-CHK-001-7 Retitle needs a RENAMED pair
- **WHEN** the no-ID fixture after `adopt` changes the MODIFIED header `REQ-UA-001 Session timeout` to `REQ-UA-001 Idle timeout`
- **THEN** `check` prints `openspec/changes/add-mfa/specs/user-auth/spec.md:<line>  retitle-needs-renamed  REQ-UA-001  "Session timeout" -> "Idle timeout"` and the hint with the RENAMED block, and after a RENAMED pair whose TO line reads `### Requirement: REQ-UA-001 Idle timeout` it prints `0 findings`

### Requirement: REQ-CHK-002 Strict rules
`specctx check --strict` SHALL add three rules. `unknown-task-req`: a task cites an ID that does not exist. `uncovered`: a canonical active REQ with no `Covers:` test. An ID named by a `## REMOVED` block of an active change SHALL be exempt from `uncovered` and `scenario-untested` until archive. A finding in `.ctx/baseline.json` SHALL be dropped in strict and non-strict mode and counted in a final line `baselined: <n>`.

#### Scenario: SCN-CHK-002-3 Pending removal is exempt
- **WHEN** an active change has `REQ-OLD-001` under `## REMOVED Requirements` and no test covers it
- **THEN** `check --strict` reports no `uncovered` and no `scenario-untested` for `REQ-OLD-001` or its scenarios

#### Scenario: SCN-CHK-002-1 Uncovered
- **WHEN** REQ-XX-003 is in main specs and no test has `Covers: REQ-XX-003`
- **THEN** `check --strict` exits 1 and prints `uncovered REQ-XX-003`

#### Scenario: SCN-CHK-002-2 Parity
- **WHEN** both engines run `check --strict` on the parity fixture with planted findings
- **THEN** the finding lists are identical

#### Scenario: SCN-CHK-002-4 Baselined findings are counted
- **WHEN** the baseline holds three entries that still fire
- **THEN** `check --strict` prints `baselined: 3` and exits 0 for a tree that is otherwise clean

### Requirement: REQ-CHK-003 Evidence rules
`check --strict` SHALL report three evidence rules. `done-without-evidence`: a `[x]` task in an active change with no evidence file. `stale-evidence`: an evidence file whose `files` digests differ from the tree. `evidence-without-done`: an evidence file whose task is `[ ]`. Archived changes SHALL be exempt from `stale-evidence`. Evidence with `kind: manual` for a task in an active change SHALL print a warning `manual-evidence <task>` that does not count as a finding.

Refs: ADR-004, REQ-TASK-004

#### Scenario: SCN-CHK-003-1 Evidence present
- **WHEN** `.ctx/evidence/001/1.1.json` exists and task 001/1.1 is `[x]` with matching digests
- **THEN** `check --strict` prints `0 findings` for a tree that is otherwise clean

#### Scenario: SCN-CHK-003-2 Hand ticked
- **WHEN** a task is `[x]` and no evidence file exists
- **THEN** `check --strict` reports `done-without-evidence 002/2.1`

#### Scenario: SCN-CHK-003-3 Code changed after done
- **WHEN** `src/a.ts` changes after evidence recorded its digest
- **THEN** `check --strict` reports `stale-evidence 002/2.1 src/a.ts`

#### Scenario: SCN-CHK-003-4 Manual evidence warns
- **WHEN** task 003/4.1 has evidence with `kind: manual` and the change is active
- **THEN** `check --strict` prints `warning: manual-evidence 003/4.1` and still exits 0 for a tree that is otherwise clean

### Requirement: REQ-CHK-004 Duplicate change key and summary
`check` SHALL report `duplicate-change-key` as a hard finding when two change folders, active or archived, resolve to one key. Human output SHALL end with one summary line `<n> findings in <m> files (<h> hard, <a> advisory)` and one line per rule present: `<rule>  <count>  <hint>`. Hints SHALL live in one table beside the rule definitions. `--json` output SHALL not change.

Refs: REQ-IDX-005

#### Scenario: SCN-CHK-004-1 Duplicate key
- **WHEN** both `001-a` and `001-b` exist under `openspec/changes/`
- **THEN** `check` prints `duplicate-change-key 001` as hard and exits 1

#### Scenario: SCN-CHK-004-2 Summary line
- **WHEN** `check --strict` finds 3 `uncovered` and 1 `req-without-scn` in two files
- **THEN** the output ends with `4 findings in 2 files (4 hard, 0 advisory)` and a line for each of the two rules with its hint

#### Scenario: SCN-CHK-004-3 Clean
- **WHEN** `check` finds nothing
- **THEN** it prints `0 findings` and exits 0

### Requirement: REQ-CHK-005 Weak Verify command
`check` SHALL report `weak-verify` for a task line of an active change whose Verify command, as `task done` runs it and trimmed, is only `true`, `:`, `exit 0`, or one `echo` with no `;`, `&`, or `|`. Plain `check` SHALL print it as an advisory warning and keep exit 0. `check --strict` SHALL print it as a hard finding and exit 1. `baseline write` SHALL record it.

Refs: REQ-CHK-001, REQ-CHK-002, REQ-VER-001, REQ-ADOPT-005

#### Scenario: SCN-CHK-005-1 Each weak form fires
- **WHEN** an active change has four task lines with Verify: `true`, Verify: `:`, Verify: `  exit 0 `, and Verify: `echo done`
- **THEN** `check --strict` prints `weak-verify` once for each of the four task IDs at its `tasks.md` line and exits 1

#### Scenario: SCN-CHK-005-2 Advisory in plain check
- **WHEN** an active change has one task line with Verify: `true` and the tree is otherwise clean
- **THEN** `check` prints `warning: weak-verify <task> <file>:<line>`, the summary counts `0 hard, 1 advisory`, and the exit code is 0

#### Scenario: SCN-CHK-005-3 A real command does not fire
- **WHEN** task lines have Verify: `bun test tests/a.test.ts`, Verify: `echo ok && bun test`, Verify: `echo ok | grep ok`, Verify: `truex`, and Verify: `exit 1`
- **THEN** `check --strict` prints no `weak-verify` finding

#### Scenario: SCN-CHK-005-4 Joined spans and cwd prefix
- **WHEN** one task line has Verify: `cwd=pkg true` and another has Verify: `true` `bun test`
- **THEN** `check --strict` reports `weak-verify` for the first task and not for the second

#### Scenario: SCN-CHK-005-5 Hint and archive
- **WHEN** an archived change has a task line with Verify: `true` and an active change has one
- **THEN** `check --strict` reports only the active task and prints the hint `Name a test file or a command whose exit code proves the task.`

#### Scenario: SCN-CHK-005-6 Baseline holds legacy debt only
- **WHEN** an active change has a task line with Verify: `true`, `baseline write` runs, and then the agent adds a second task line with Verify: `echo ok`
- **THEN** `.ctx/baseline.json` holds `weak-verify` for the first task, and `check --strict` reports `weak-verify` only for the second task and prints `baselined: 1`

### Requirement: REQ-CHK-006 Hint per finding
A finding MAY carry its own hint. The rule line of the summary SHALL print the distinct hints of its findings, or the hint of the table when no finding carries one. `retitle-needs-renamed` SHALL print the RENAMED block with the main header as `FROM` and the delta header as `TO`, each copied as the file writes it. The `stale-evidence` hint SHALL name `task reopen <task> <why>`. `--json` output SHALL not change.

Refs: REQ-CHK-001, REQ-CHK-003, REQ-CHK-004, REQ-ADOPT-010

#### Scenario: SCN-CHK-006-1 Retitle hint in the form of the headers
- **WHEN** main holds `### Requirement: REQ-UA-001 Session timeout` and the MODIFIED block of a delta holds `### Requirement: [REQ-UA-001] Idle timeout` with no RENAMED block
- **THEN** the rule line of `check` ends with a block whose lines are `## RENAMED Requirements`, ``- FROM: `### Requirement: REQ-UA-001 Session timeout` ``, and ``- TO: `### Requirement: [REQ-UA-001] Idle timeout` ``

#### Scenario: SCN-CHK-006-2 Stale evidence hint
- **WHEN** `check --strict` finds `stale-evidence`
- **THEN** the rule line reads `Run specctx task reopen <task> <why>, then specctx task done <task>.`

#### Scenario: SCN-CHK-006-3 Other rules and JSON stay
- **WHEN** `check --strict` finds `uncovered`, and `check --json` finds `retitle-needs-renamed`
- **THEN** the rule line of `uncovered` carries the hint of the table, and no finding object of `--json` holds a `hint` key

### Requirement: REQ-CHK-007 Dangling-ref hint names the string literal cause
The hint of `dangling-ref` SHALL name the likely cause, which is a tag inside a string literal or fixture text, and the fix. The fix is to build the text at run time or to move the file under a path in `[scan] ignore`. The scan SHALL keep reading such a tag as a link.

Refs: REQ-CHK-006, REQ-IDX-001

#### Scenario: SCN-CHK-007-1 Hint names cause and fix
- **WHEN** `check` finds `dangling-ref` for a code tag that sits inside a quoted string of a test file
- **THEN** the rule line of `dangling-ref` names `string literal` and `fixture text`, and it names `run time` and `[scan] ignore`

#### Scenario: SCN-CHK-007-2 The scan does not skip strings
- **WHEN** a file under `src/` holds a quoted string with a tag of an ID that no entry has
- **THEN** `check` reports `dangling-ref` for that line
