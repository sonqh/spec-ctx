## MODIFIED Requirements

### Requirement: REQ-VER-007 Run order and report
Closed tasks with the same frozen command and cwd SHALL run once and share the result. Groups run one at a time, in the ID order of their first task, with the current env plus `CI=1` and `SPECCTX_RERUN=1`. A `mismatch` SHALL print file:line, the evidence path, the expected and actual exit, the last 20 lines of output, and one line to reproduce it locally. The line quotes the cwd and the command.

Refs: REQ-VER-006, REQ-VER-003

#### Scenario: SCN-VER-007-1 Dedupe
- **WHEN** tasks 1.1 and 2.1 have the same frozen command and cwd
- **THEN** the command runs once, and both tasks get a line with the same result

#### Scenario: SCN-VER-007-2 Order and env
- **WHEN** closed tasks 2.1 and 1.1 have different commands
- **THEN** the 1.1 command runs first, then the 2.1 command, and each sees `CI=1` and `SPECCTX_RERUN=1`

#### Scenario: SCN-VER-007-3 Mismatch report
- **WHEN** a command exits 3 where the evidence says 0, and the cwd holds a space
- **THEN** the report holds the file:line of the task, the evidence path, `expected exit 0`, `actual exit 3`, the last 20 lines of output, and a `reproduce:` line that starts with `cd '<cwd>' &&`
