# cli Specification

## Purpose
One binary, `specctx`, with short help in Strict STE and stable exit codes.

## Requirements

### Requirement: REQ-CLI-001 Commands and flags
`specctx` SHALL expose `build`, `status`, `query`, `related`, `bundle`, `check`, `id new`, `id retire`, `task next`, `task start`, `task verify`, `task done`, `task reopen`, `handoff write`, `handoff ask`, `handoff resolve`, `init`, `adopt`, `baseline write`, `baseline prune`, `task backfill`, `stats`. Global flags: `--root <path>`, `--json`, `--help`, `--version`. Help SHALL group them under `Read`, `Write`, and `Setup`.

#### Scenario: SCN-CLI-001-1 Version
- **WHEN** `specctx --version` runs
- **THEN** stdout is the version and a newline, exit 0

#### Scenario: SCN-CLI-001-2 Root discovery
- **WHEN** `specctx status` runs from `src/deep/dir` of a project
- **THEN** it uses the project root and prints the same as from the root

#### Scenario: SCN-CLI-001-3 Nothing active
- **WHEN** every change is archived
- **THEN** `status` prints `no active change` and the last archived change, ordered by the `archived` time in each `.openspec.yaml` and then by folder name

#### Scenario: SCN-CLI-001-4 Help groups
- **WHEN** `specctx --help` runs
- **THEN** the output has the headers `Read`, `Write`, and `Setup`

#### Scenario: SCN-CLI-001-5 Adopt commands in Setup
- **WHEN** `specctx --help` runs
- **THEN** `adopt`, `baseline write`, `baseline prune`, and `task backfill` appear under `Setup`

#### Scenario: SCN-CLI-001-6 Stats under Read
- **WHEN** `specctx --help` runs
- **THEN** `stats` appears under `Read`

#### Scenario: SCN-CLI-001-7 Same day archives
- **WHEN** 005 and 006 were archived on one day and 005 later than 006
- **THEN** `status` prints `last archived: 005-metrics`

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

### Requirement: REQ-CLI-005 Spec length check in gate
`gate` SHALL add a fourth step after validate. It SHALL read every requirement in the deltas of active changes and report `spec-length: fail <ID> <n> chars` when the text after the header is longer than 500 characters. This is the limit strict validate applies to main specs after archive. The step SHALL exit 1 on any failure.

Refs: REQ-CLI-004

#### Scenario: SCN-CLI-005-1 Long requirement caught
- **WHEN** an active delta has a requirement of 535 characters
- **THEN** `gate --strict` prints `spec-length: fail <ID> 535 chars` and exits 1

#### Scenario: SCN-CLI-005-2 Short requirements pass
- **WHEN** every active delta requirement is at most 500 characters
- **THEN** `gate` prints `spec-length: ok`
