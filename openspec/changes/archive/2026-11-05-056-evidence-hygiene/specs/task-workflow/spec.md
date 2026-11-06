## ADDED Requirements

### Requirement: REQ-TASK-008 No machine paths in evidence
`task done` SHALL replace the project root and its real path with `.` and the home directory with `~`. This applies to `verify.stderr_tail` of evidence, `stderr_tail` of a fail file, and the cap question. The longest path SHALL go first. A match SHALL need a start of text or a character other than a letter, digit, `.`, `_`, or `-` before it. `verify.command` and printed output SHALL not change.

Refs: REQ-TASK-004, REQ-LOOP-002, REQ-VER-006

#### Scenario: SCN-TASK-008-1 Root and home redacted
- **WHEN** the project root is `<r>`, `HOME` is `<h>` outside it, and a passing Verify writes `<r>/a.ts` and `<h>/x` to stderr
- **THEN** `verify.stderr_tail` is `./a.ts` and `~/x` on two lines, `verify.command` equals the task line command, and the printed output keeps the full paths

#### Scenario: SCN-TASK-008-2 Fail file and cap question redacted
- **WHEN** a failing Verify writes `FAIL <r>/a.test.ts` three times in a row
- **THEN** each fail file holds `FAIL ./a.test.ts`, and the cap question reads `Last: FAIL ./a.test.ts.`
