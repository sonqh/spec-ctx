## ADDED Requirements

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
