# cli (delta)

## ADDED Requirements

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
