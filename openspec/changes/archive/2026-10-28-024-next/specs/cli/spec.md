# cli (delta)

## MODIFIED Requirements

### Requirement: REQ-CLI-001 Commands and flags
`specctx` SHALL expose `build`, `status`, `next`, `query`, `related`, `bundle`, `check`, `id new`, `id retire`, `task next`, `task start`, `task verify`, `task done`, `task reopen`, `handoff write`, `handoff ask`, `handoff resolve`, `init`, `adopt`, `baseline write`, `baseline prune`, `stats`. Global flags: `--root <path>`, `--json`, `--help`, `--version`. Help SHALL group them under `Read`, `Write`, and `Setup`.

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
- **THEN** `adopt`, `baseline write`, and `baseline prune` appear under `Setup`, and no line names `task backfill`

#### Scenario: SCN-CLI-001-6 Stats under Read
- **WHEN** `specctx --help` runs
- **THEN** `stats` appears under `Read`

#### Scenario: SCN-CLI-001-7 Same day archives
- **WHEN** 005 and 006 were archived on one day and 005 later than 006
- **THEN** `status` prints `last archived: 005-metrics`

#### Scenario: SCN-CLI-001-8 Next under Read
- **WHEN** `specctx --help` runs
- **THEN** `next` appears under `Read` with the flag `--change <name>`, `specctx next --help` prints that page only, and the unknown command list names `next`
