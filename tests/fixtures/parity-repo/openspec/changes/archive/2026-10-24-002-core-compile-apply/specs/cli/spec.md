# Spec Delta

## Purpose

Defines the command surface, flags, output conventions, and exit codes of the agentrc CLI.

## ADDED Requirements

### Requirement: REQ-CLI-001 Commands
The CLI SHALL expose `init`, `validate`, `plan`, `apply`, `revert`, `status`, `import`, and `audit`. In this change `init` SHALL compile and apply an existing profile. `import` and `audit` SHALL print `not implemented` and exit 4.

#### Scenario: SCN-CLI-001-1 Unknown command
- **WHEN** `agentrc frobnicate` runs
- **THEN** it exits 2 and prints the command list

### Requirement: REQ-CLI-002 Global flags
Every command SHALL accept `--profile <path>`, `--agents <a,b>` to restrict agents, `--json` for machine output, and `--verbose`.

Refs: REQ-PROF-001

#### Scenario: SCN-CLI-002-1 Agent filter
- **WHEN** `plan --agents codex` runs
- **THEN** only Codex artifacts are listed

### Requirement: REQ-CLI-003 Exit codes
Exit codes SHALL be: 0 success, 1 check or drift found, 2 invalid input or profile, 3 confirmation needed, 4 not implemented, 5 write failure.

Refs: ADR-003

#### Scenario: SCN-CLI-003-1 Drift exit
- **WHEN** `status` finds a drifted artifact
- **THEN** it exits 1

### Requirement: REQ-CLI-004 Output style
Human output SHALL be one line per item, no ANSI color when stdout is not a TTY, and no emoji. `--json` SHALL print a single JSON document on stdout and nothing else.

#### Scenario: SCN-CLI-004-1 JSON only
- **WHEN** `plan --json` runs
- **THEN** stdout parses as JSON and stderr is empty

### Requirement: REQ-CLI-005 Tool descriptions in Strict STE
Every command and flag description shown by `--help` SHALL pass `scripts/ste-lint.py` with `--baseline 0`.

Refs: ADR-006

#### Scenario: SCN-CLI-005-1 Help text lint
- **WHEN** `agentrc --help` output is piped to `ste-lint.py`
- **THEN** it exits 0
