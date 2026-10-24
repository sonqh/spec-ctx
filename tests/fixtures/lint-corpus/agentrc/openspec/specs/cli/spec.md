# cli Specification

## Purpose
Defines the command surface, flags, output conventions, and exit codes of the agentrc CLI.

## Requirements

### Requirement: REQ-CLI-001 Commands
The CLI SHALL expose `init`, `apply`, `status`, `revert` as basic commands and `plan`, `elicit`, `import`, `validate`, `resolve`, `update` as advanced commands. Help SHALL list the two groups under the headers `Commands` and `Advanced`. A command that is not implemented SHALL not appear in help and SHALL be treated as unknown.

#### Scenario: SCN-CLI-001-1 Unknown command
- **WHEN** `agentrc frobnicate` runs
- **THEN** it exits 2 and prints the command list

#### Scenario: SCN-CLI-001-2 No phantom command
- **WHEN** `agentrc --help` runs
- **THEN** the output does not contain `audit`

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
Human output SHALL be one line per item, no ANSI color when stdout is not a TTY, and no emoji. `--json` SHALL print a single JSON document on stdout and nothing else. Child process output SHALL appear only with `--verbose`.

#### Scenario: SCN-CLI-004-1 JSON only
- **WHEN** `plan --json` runs
- **THEN** stdout parses as JSON and stderr is empty

#### Scenario: SCN-CLI-004-2 No raw stderr
- **WHEN** a catalog fetch fails without `--verbose`
- **THEN** the output contains no line that starts with `npm` or `git:`

### Requirement: REQ-CLI-005 Tool descriptions in Strict STE
Every command and flag description shown by `--help` SHALL pass `scripts/ste-lint.py` with `--baseline 0`.

Refs: ADR-006

#### Scenario: SCN-CLI-005-1 Help text lint
- **WHEN** `agentrc --help` output is piped to `ste-lint.py`
- **THEN** it exits 0

### Requirement: REQ-CLI-006 Version flag
`agentrc --version` and `agentrc -v` SHALL print the version alone and exit 0. Help SHALL list `--version` under global flags.

#### Scenario: SCN-CLI-006-1 Version output
- **WHEN** `agentrc --version` runs
- **THEN** stdout is the version string followed by a newline and the exit code is 0

### Requirement: REQ-CLI-007 Not-ready errors point to init
When a command needs a profile or a lockfile that does not exist, the error SHALL name the missing file and end with the line `Run: agentrc init`. No not-ready error SHALL point to another command.

Refs: REQ-PROF-001

#### Scenario: SCN-CLI-007-1 Status without lockfile
- **WHEN** `status` runs with no lockfile
- **THEN** the message names the lockfile path and ends with `Run: agentrc init`

### Requirement: REQ-CLI-008 Summary by default, diff on request
`plan`, `apply` and `init` SHALL print one summary line per artifact by default: action, agent, path, and for `update` the count of added and removed lines. The unified diff SHALL print only with `--diff`. The summary SHALL end with one totals line.

Refs: REQ-APPLY-002

#### Scenario: SCN-CLI-008-1 Default is summary
- **WHEN** `plan` runs without `--diff` on a profile that changes `settings.json`
- **THEN** the output has one line for `settings.json` with `+N -M` and no line that starts with `@@`

#### Scenario: SCN-CLI-008-2 Diff on request
- **WHEN** `plan --diff` runs
- **THEN** the output contains the unified diff after the summary

### Requirement: REQ-CLI-009 Degradations only for written agents
`plan` and `apply` SHALL print `degraded:` lines only for agents that have at least one artifact with action `create`, `update` or `remove`. Degradations for skipped or disabled agents SHALL appear only in `--json` output.

Refs: REQ-IC-008

#### Scenario: SCN-CLI-009-1 Skipped agent is quiet
- **WHEN** Codex is enabled but not installed and `plan` runs
- **THEN** no `degraded: codex` line appears

### Requirement: REQ-CLI-010 Concept glossary
`agentrc --help` SHALL end with a `Terms` section of at most six lines. It SHALL define `profile`, `managed block`, `lockfile`, `drift`, `backup set` and `catalog item` in one line each, Strict STE.

Refs: REQ-CLI-005

#### Scenario: SCN-CLI-010-1 Terms present
- **WHEN** `agentrc --help` runs
- **THEN** the output contains a `Terms` header and a line that starts with `drift`
