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

### Requirement: REQ-CLI-006 Per command help
`specctx <cmd> --help`, `specctx <cmd> <sub> --help`, and `specctx help <cmd>` SHALL print the page of that command only: usage, one line summary, flags, exit codes, one example. `lint tells --help` and `lint ste --help` SHALL use the same layout. All pages SHALL render from one table that also feeds `specctx --help`. Every page SHALL pass `lint ste --baseline 0`. `help` and `lint` SHALL appear in the unknown command list.

Refs: REQ-CLI-001

#### Scenario: SCN-CLI-006-1 One command
- **WHEN** `specctx task start --help` runs
- **THEN** stdout has the `task start` usage line and no line about `adopt`

#### Scenario: SCN-CLI-006-2 Lint in the same style
- **WHEN** `specctx lint tells --help` and `specctx status --help` run
- **THEN** both pages have the sections `Usage`, `Flags`, `Exit codes`, `Example` in that order

#### Scenario: SCN-CLI-006-3 Unknown command list
- **WHEN** `specctx frobnicate` runs
- **THEN** the printed command list contains `help` and `lint`

### Requirement: REQ-CLI-007 Next steps and project detection
Every command except `init`, `--help`, and `--version` SHALL exit 2 with `not an OpenSpec project (no openspec/ under <root>)` and write nothing when `openspec/` is missing. `status`, `task next`, `init`, and `adopt --dry-run` SHALL end with a `next:` line from a fixed table. `init` with every file present and equal SHALL print `nothing to do` and exit 0. `adopt` with no header to change SHALL write no `adopt-report.md`.

#### Scenario: SCN-CLI-007-1 Not a project
- **WHEN** `specctx status` runs in an empty folder
- **THEN** it exits 2, prints the message, and no `.ctx/` folder exists after

#### Scenario: SCN-CLI-007-2 Status next step
- **WHEN** `status` runs and a task is open
- **THEN** the last line is `next: specctx task next`

#### Scenario: SCN-CLI-007-3 Init twice
- **WHEN** `init --all` runs twice in a row
- **THEN** the second run prints `nothing to do` and exits 0

#### Scenario: SCN-CLI-007-4 Adopt with nothing to do
- **WHEN** `adopt` runs on a project where every header has an ID
- **THEN** it prints `nothing to adopt`, exits 0, and no `adopt-report.md` exists

### Requirement: REQ-CLI-004 gate command
`specctx gate [--strict] [--markdown <globs>]` SHALL run these gates in order: `check` (after `build`), `specctx lint tells` and `specctx lint ste` on the markdown globs, then `openspec validate --all`. Default globs: `openspec/**/*.md decisions/*.md docs/**/*.md *.md`. It SHALL print one `ok` or `fail` line per gate, stop at the first failure, and exit 1. `gate` SHALL need no `python3`.

Refs: REQ-CHK-001, REQ-GOV-003

#### Scenario: SCN-CLI-004-1 Clean tree
- **WHEN** `specctx gate --strict` runs on this repository
- **THEN** it prints three `ok` lines and exits 0

#### Scenario: SCN-CLI-004-2 Stops at first failure
- **WHEN** a spec has a dangling ref
- **THEN** `gate` prints `check: fail`, prints the findings, runs no linter, and exits 1

#### Scenario: SCN-CLI-004-3 No python
- **WHEN** `python3` is not on PATH
- **THEN** `gate --strict` runs both linters and the output has no `skipped` line
