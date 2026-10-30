## MODIFIED Requirements

### Requirement: REQ-LOOP-006 Fix reason
The reason of `next` for a failed Verify SHALL be `Verify failed (exit <e>): <line>`. `<line>` SHALL be the last line of the stderr tail that starts with `fail:`, `FAIL`, or `(fail)` after trimming. With no such line, it SHALL be the last non-empty line. With no non-empty line, it SHALL be `no output`.

Refs: REQ-LOOP-001, REQ-LOOP-002

#### Scenario: SCN-LOOP-006-1 Last fail line
- **WHEN** the newest fail file of the current task has the tail `$ bun test`, `fail: one`, `ok`, ` FAIL two`, `1 fail`
- **THEN** `next --json` prints `action: fix` with the reason `Verify failed (exit 1): FAIL two`

#### Scenario: SCN-LOOP-006-2 No fail line
- **WHEN** the tail is `first`, `last`, and an empty line
- **THEN** the reason ends with `: last`

#### Scenario: SCN-LOOP-006-3 Empty tail
- **WHEN** the tail is empty or holds only spaces
- **THEN** the reason ends with `: no output`

#### Scenario: SCN-LOOP-006-4 Bun failure tail
- **WHEN** the tail is a `bun test` failure: `(fail) adds [0.12ms]`, an `error:` line, ` 1 fail`, and `Ran 28 tests across 4 files.`
- **THEN** the reason ends with `: (fail) adds [0.12ms]`, and the attempt-cap question quotes the same line

#### Scenario: SCN-LOOP-006-5 Last of mixed prefixes
- **WHEN** the tail holds `FAIL one`, then `  (fail) two`, then `fail: three`, then `ok`
- **THEN** the reason ends with `: fail: three`
