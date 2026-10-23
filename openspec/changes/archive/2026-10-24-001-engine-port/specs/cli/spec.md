# cli

## Purpose

One binary, `specctx`, with short help in Strict STE and stable exit codes.

## ADDED Requirements

### Requirement: REQ-CLI-001 Commands and flags
`specctx` SHALL expose `build`, `status`, `query`, `related`, `bundle`, `check`. Global flags: `--root <path>` (default: nearest parent with `spec-ctx.toml` or `openspec/`), `--json`, `--help`, `--version`. `status` SHALL print active changes with done and open task counts and the uncovered REQ count. With no active change it SHALL print the last archived change and the open questions from `.ctx/handoff.md`.

#### Scenario: SCN-CLI-001-1 Version
- **WHEN** `specctx --version` runs
- **THEN** stdout is the version and a newline, exit 0

#### Scenario: SCN-CLI-001-2 Root discovery
- **WHEN** `specctx status` runs from `src/deep/dir` of a project
- **THEN** it uses the project root and prints the same as from the root

#### Scenario: SCN-CLI-001-3 Nothing active
- **WHEN** every change is archived
- **THEN** `status` prints `no active change` and the last archived change by archive time

### Requirement: REQ-CLI-002 Exit codes and output style
Exit codes: 0 ok, 1 findings or drift, 2 usage or missing input, 3 internal error. Human output SHALL be one line per item, no color when stdout is not a TTY, no emoji. `--json` SHALL print one JSON document on stdout and nothing else. Help text SHALL pass `scripts/ste-lint.py --baseline 0`.

#### Scenario: SCN-CLI-002-1 Unknown command
- **WHEN** `specctx frobnicate` runs
- **THEN** it exits 2 and prints the command list

#### Scenario: SCN-CLI-002-2 JSON only
- **WHEN** `specctx check --json` runs
- **THEN** stdout parses as JSON and stderr is empty

### Requirement: REQ-CLI-003 Fast startup
`specctx --version` SHALL load no module from `src/index/`, `src/graph/`, or `src/check/`. Each command SHALL import its module inside its action.

Refs: ADR-001

#### Scenario: SCN-CLI-003-1 Module list
- **WHEN** the startup test records modules loaded by `--version`
- **THEN** none is under `src/index/`, `src/graph/`, or `src/check/`
