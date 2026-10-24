# distribution

## Purpose

How spec-ctx is configured, built, and run on a user's machine.

## ADDED Requirements

### Requirement: REQ-DIST-001 Runtime compatibility
The published package SHALL run on Node 22 with `node dist/cli.js` and no build step. Source SHALL use only APIs that Node 22 provides. CI SHALL run the test suite on Bun and on Node 22. `bun build --compile` SHALL produce a working single binary.

Refs: ADR-001

#### Scenario: SCN-DIST-001-1 Node run
- **WHEN** `node dist/cli.js --version` runs after `bun run build`
- **THEN** it prints the version and exits 0

#### Scenario: SCN-DIST-001-2 No Bun global
- **WHEN** the source is searched for `Bun.`
- **THEN** there are no matches outside `scripts/`

### Requirement: REQ-DIST-002 Config file
`spec-ctx.toml` SHALL hold `[scan]` paths and `ignore`, `[ids] caps` (list of capability codes), `[ids] task_pattern`, `[bundle] budget`, `[bundle] depth`. Missing keys SHALL take the defaults from REQ-IDX-001 and REQ-QRY-003. A missing file SHALL mean all defaults. `specctx init` SHALL write a commented default file and exit 2 if one exists.

Refs: ADR-001

#### Scenario: SCN-DIST-002-1 Defaults
- **WHEN** no `spec-ctx.toml` exists
- **THEN** `build` scans the default paths

#### Scenario: SCN-DIST-002-2 Init
- **WHEN** `specctx init` runs in an empty project
- **THEN** `spec-ctx.toml` exists with a comment above every key

### Requirement: REQ-DIST-003 Parity harness
`tests/parity/run.sh` SHALL run the Python engine and the TypeScript engine on `tests/fixtures/parity-repo/` for `build`, `status`, `query push main`, `related REQ-APPLY-005`, `bundle REQ-APPLY-001 --budget 3000`, `check`, `check --strict`, and diff each output. It SHALL exit 1 on any difference.

#### Scenario: SCN-DIST-003-1 Green parity
- **WHEN** `tests/parity/run.sh` runs after change 001
- **THEN** it prints `parity: 7 commands identical` and exits 0
