## MODIFIED Requirements

### Requirement: REQ-LOOP-002 Fail files and the attempt cap
A non zero Verify exit in `task done` SHALL write `.ctx/evidence/<c>/<t>.fail-<n>.json` with the keys `at`, `attempt`, `stderr_tail`, `task`, `verify`. `attempt` SHALL be the fail files of the task since `current.json.started_at` plus one. A resolved question for the task resets the count. At `[loop] max_attempts`, `task done` SHALL append a question that quotes the fail line and print a `blocked:` line. No command SHALL read a fail file as evidence.

Refs: ADR-006, REQ-TASK-003, REQ-HND-002

#### Scenario: SCN-LOOP-002-1 First failure
- **WHEN** `task start 002/2.2` ran and the Verify command of `002/2.2` exits 1
- **THEN** `.ctx/evidence/002/2.2.fail-1.json` exists with `attempt: 1`, `task: 002/2.2`, `verify.exit: 1`, and the printed tail under `stderr_tail`, no `.ctx/evidence/002/2.2.json` exists, and `task done` exits 1

#### Scenario: SCN-LOOP-002-2 Cap reached
- **WHEN** `[loop] max_attempts = 3` and the third `task done 002/2.2` since `task start` fails
- **THEN** `.ctx/questions.json` gains an open question with `task: 002/2.2` and the text `task 002/2.2 failed Verify 3 times. Last: <the failing line of the tail>. What should change?`, the last line is `blocked: question <k> written. Run specctx handoff resolve <k> "<answer>" to continue.`. A fourth run adds no second question. The exit code is 1

#### Scenario: SCN-LOOP-002-3 Attempt window
- **WHEN** two fail files of `002/2.2` exist from before `current.json.started_at`, or `handoff resolve` closed the question of the cap
- **THEN** the next failure writes `attempt: 1`, and without `current.json` no earlier fail file of the task counts

#### Scenario: SCN-LOOP-002-4 Fail files are not evidence
- **WHEN** `.ctx/evidence/002/2.2.fail-1.json` exists and `002/2.2` is open
- **THEN** `check --strict` reports no `evidence-without-done` for it, `stats` counts no evidence for `002`, and a later passing `task done 002/2.2` writes `2.2.json` and keeps `2.2.fail-1.json`

#### Scenario: SCN-LOOP-002-5 Cap question quotes the failing line
- **WHEN** the third failure of `002/2.2` has the tail `$ bun test`, `FAIL two`, `1 fail`
- **THEN** the new question reads `task 002/2.2 failed Verify 3 times. Last: FAIL two. What should change?`

## ADDED Requirements

### Requirement: REQ-LOOP-017 Fail files stay out of git
When `task done` writes a fail file, it SHALL make sure `.ctx/evidence/.gitignore` has the line `*.fail-*.json`. It creates the file when absent and appends the line when absent. It SHALL keep every other line and its order. A write error SHALL not change the output or the exit code of `task done`.

Refs: REQ-LOOP-002

#### Scenario: SCN-LOOP-017-1 Ignore file created
- **WHEN** `.ctx/evidence/.gitignore` is absent and `task done 002/2.2` fails Verify
- **THEN** `.ctx/evidence/.gitignore` reads `*.fail-*.json` and a newline, and `git check-ignore` reports `.ctx/evidence/002/2.2.fail-1.json` as ignored

#### Scenario: SCN-LOOP-017-2 Ignore file kept
- **WHEN** `.ctx/evidence/.gitignore` holds `keep.json` with no final newline, or already holds `*.fail-*.json`, and `task done` fails Verify twice
- **THEN** the file holds `keep.json` first and `*.fail-*.json` once, and a second failure leaves it byte-identical

### Requirement: REQ-LOOP-018 Attempt window without a current task
When `.ctx/current.json` does not name the task, no fail file SHALL count toward its attempts. A failed `task done` for such a task SHALL first write `current.json` with only `started_at` and `task`, so its fail file is attempt 1 and later failures count. It SHALL replace a `current.json` that names another task. Fail files from another clone SHALL not raise the cap question.

Refs: REQ-LOOP-002, REQ-TASK-002

#### Scenario: SCN-LOOP-018-1 Fresh clone
- **WHEN** two fail files of `002/2.2` from another clone exist, no `.ctx/current.json` exists, and `task done 002/2.2` fails Verify
- **THEN** the new fail file has `attempt: 1`, `task done` writes no question, `.ctx/current.json` names `002/2.2`, and `next --json` returns `fix` with `attempt: 1`

#### Scenario: SCN-LOOP-018-2 Cap without task start
- **WHEN** no `.ctx/current.json` exists and `task done 002/2.2` fails Verify three times with `[loop] max_attempts = 3`
- **THEN** the third failure has `attempt: 3` and writes the cap question

#### Scenario: SCN-LOOP-018-3 Current task is another task
- **WHEN** `task start 002/2.1` ran and `task done 002/2.2` fails Verify
- **THEN** the fail file has `attempt: 1`, `.ctx/current.json` names `002/2.2` with no `bundle_chars` and no `verify`, and `next --json` returns `fix` for `002/2.2` with `attempt: 1`

#### Scenario: SCN-LOOP-018-4 Cycle time needs task start
- **WHEN** a failed `task done 002/2.2` with no `task start` wrote `current.json`, and a later `task done 002/2.2` passes
- **THEN** the evidence has no `started_at` and no `bundle_chars`, and after `task start` a pass copies both
