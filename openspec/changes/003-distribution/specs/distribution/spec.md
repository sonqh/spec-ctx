# distribution

## RENAMED Requirements

- FROM: `### Requirement: REQ-DIST-002 Config file`
- TO: `### Requirement: REQ-DIST-002 Config file and init`

## MODIFIED Requirements

### Requirement: REQ-DIST-002 Config file and init
`spec-ctx.toml` SHALL hold `[scan]`, `[ids] caps`, `[ids] task_pattern`, `[bundle] budget`, `[bundle] depth`, `[verify] timeout_s`. Missing keys SHALL take defaults. `specctx init` SHALL write a commented default file. `init --schema` SHALL install the schema bundle and merge the config fragment. `init --skills` SHALL install the skills. `init --all` SHALL do all three. It SHALL exit 2 if `spec-ctx.toml` exists and `--force` is absent.

Refs: ADR-001, REQ-SCH-003, REQ-SKL-002

#### Scenario: SCN-DIST-002-1 Defaults
- **WHEN** no `spec-ctx.toml` exists
- **THEN** `build` scans the default paths

#### Scenario: SCN-DIST-002-2 Init
- **WHEN** `specctx init` runs in an empty project
- **THEN** `spec-ctx.toml` exists with a comment above every key

#### Scenario: SCN-DIST-002-3 Init all
- **WHEN** `specctx init --all` runs on a fresh `openspec init` project
- **THEN** the config, the schema, and the skills exist and `specctx status` exits 0

## ADDED Requirements

### Requirement: REQ-DIST-004 Publish and binaries
The package SHALL publish to npm as `spec-ctx` from a tag `v<version>` through a GitHub workflow with `NPM_TOKEN`. The same workflow SHALL attach `bun build --compile` binaries for linux x64, darwin arm64, and darwin x64 to the release.

Refs: ADR-001

#### Scenario: SCN-DIST-004-1 npx works
- **WHEN** `npx spec-ctx@<version> --version` runs on a clean machine with Node 22
- **THEN** it prints the version

#### Scenario: SCN-DIST-004-2 Binary works
- **WHEN** the linux x64 binary runs `--version`
- **THEN** it prints the version

### Requirement: REQ-DIST-005 GitHub Action
`action.yml` at the repo root SHALL run `specctx check --strict`, both linters on the configured markdown paths, and `openspec validate --all --strict`. Inputs: `version` (default latest), `strict` (default true).

Refs: REQ-GOV-003

#### Scenario: SCN-DIST-005-1 Action on agentrc
- **WHEN** agentrc CI uses `sonqh/spec-ctx@v0`
- **THEN** the job runs the three checks and passes on a clean tree

### Requirement: REQ-DIST-006 agentrc migration
agentrc SHALL run on the published package: `spec-ctx.toml` present, `tools/ctx/` removed, hooks and CI call `specctx`, evidence backfilled with `--manual "migrated"` for archived tasks. `specctx check --strict` SHALL pass there.

#### Scenario: SCN-DIST-006-1 agentrc green
- **WHEN** agentrc CI runs after the migration commit
- **THEN** the `specs` job passes with `specctx`

### Requirement: REQ-DIST-007 Python engine removed
After REQ-DIST-006 holds, `tools/ctx/` and `tests/parity/` SHALL be removed from this repo. The pre-commit hook SHALL call `specctx` only.

Refs: ADR-001

#### Scenario: SCN-DIST-007-1 No python left
- **WHEN** the tree is searched for `ctx.py`
- **THEN** there are no matches outside `docs/`
