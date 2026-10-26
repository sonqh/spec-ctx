# distribution

## RENAMED Requirements
- FROM: `### Requirement: REQ-DIST-003 Parity harness`
- TO: `### Requirement: REQ-DIST-003 Golden harness`

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

### Requirement: REQ-DIST-003 Golden harness
`tests/parity/run.sh` SHALL run the TypeScript engine on `tests/fixtures/parity-repo/` for `build`, `status`, `query push main`, `related REQ-APPLY-005`, `bundle REQ-APPLY-001 --budget 3000`, `check`, `check --strict`. It SHALL diff each output and the index against the recorded goldens under `tests/fixtures/parity-golden/` and exit 1 on any difference. `run.sh --record` SHALL rewrite the goldens. The goldens were recorded from the Python engine before its removal.

#### Scenario: SCN-DIST-003-1 Green parity
- **WHEN** `tests/parity/run.sh` runs
- **THEN** it prints `parity: 7 commands identical` and exits 0

#### Scenario: SCN-DIST-003-2 Drift is caught
- **WHEN** the bundle order changes in the engine
- **THEN** `tests/parity/run.sh` exits 1 and names `bundle`

## ADDED Requirements

### Requirement: REQ-DIST-004 Publish and binaries
The `release` workflow SHALL run on push to `main`. It SHALL read `version` from `package.json`. When `spec-ctx@<version>` is not on npm, it SHALL publish with `NPM_TOKEN`, create the tag `v<version>` on that commit, and move the tag `v<major>` to it. It SHALL attach `bun build --compile` binaries for linux x64, darwin arm64, and darwin x64 to the GitHub release. When the version is on npm, it SHALL exit 0 and publish nothing.

Refs: ADR-001, REQ-GOV-007

#### Scenario: SCN-DIST-004-1 npx works
- **WHEN** `npx spec-ctx@<version> --version` runs on a clean machine with Node 22
- **THEN** it prints the version

#### Scenario: SCN-DIST-004-2 Binary works
- **WHEN** the linux x64 binary runs `--version`
- **THEN** it prints the version

#### Scenario: SCN-DIST-004-3 Same version twice
- **WHEN** a push to `main` lands and `package.json` holds a version that npm already has
- **THEN** the workflow prints `spec-ctx@<version> is on npm. Nothing to publish.` and exits 0

#### Scenario: SCN-DIST-004-4 Tags from the workflow
- **WHEN** the workflow publishes `0.1.0`
- **THEN** the tags `v0.1.0` and `v0` point at the published commit

### Requirement: REQ-DIST-005 GitHub Action
`action.yml` at the repo root SHALL run `specctx gate`, which covers `check`, both linters on the configured markdown paths, and `openspec validate --all`. Inputs: `version` (default latest), `strict` (default true), `markdown`, `specctx`. The action SHALL hold no gate logic of its own beyond choosing the `specctx` command.

Refs: REQ-GOV-003, REQ-CLI-004

#### Scenario: SCN-DIST-005-1 Action on agentrc
- **WHEN** agentrc CI uses `sonqh/spec-ctx@v0`
- **THEN** the job runs the three checks and passes on a clean tree

### Requirement: REQ-DIST-006 agentrc migration
agentrc SHALL run on the published package: `spec-ctx.toml` present, `tools/ctx/` removed, hooks and CI call `specctx`, evidence backfilled with `--manual "migrated"` for archived tasks. `specctx check --strict` SHALL pass there.

#### Scenario: SCN-DIST-006-1 agentrc green
- **WHEN** agentrc CI runs after the migration commit
- **THEN** the `specs` job passes with `specctx`

### Requirement: REQ-DIST-007 Python engine removed
After REQ-DIST-006 holds, `tools/ctx/` and the Python oracle run in `tests/parity/run.sh` SHALL be removed from this repo. The goldens stay. The hooks SHALL call `specctx` only. `CLAUDE.md` and `DELEGATION.md` SHALL no longer name the Python engine.

Refs: ADR-001

#### Scenario: SCN-DIST-007-1 No python left
- **WHEN** `src/`, `tests/`, `scripts/`, `skills/`, `schemas/`, `.githooks/`, `.github/`, `CLAUDE.md`, `README.md`, and `DELEGATION.md` are searched for `ctx.py`
- **THEN** there are no matches

### Requirement: REQ-DIST-008 Install from git before publish
`package.json` SHALL have a `prepare` script that builds `dist/` with Node only, so `npx -y github:sonqh/spec-ctx#<ref> --version` works without npm publish and without Bun. The action input `version` SHALL accept `github:sonqh/spec-ctx#<ref>` and pass it to `npx` unchanged. The README SHALL show both install forms until 1.0.

Refs: ADR-001, REQ-DIST-004

#### Scenario: SCN-DIST-008-1 npx from git
- **WHEN** `npx -y github:sonqh/spec-ctx#main --version` runs in a clean temp dir with Node 22 and no Bun
- **THEN** it prints the version and exits 0

#### Scenario: SCN-DIST-008-2 Action from git
- **WHEN** the action runs with `version: github:sonqh/spec-ctx#main`
- **THEN** it calls `npx -y github:sonqh/spec-ctx#main gate --strict`

