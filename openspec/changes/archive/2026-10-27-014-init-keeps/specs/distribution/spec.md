# distribution (delta)

## MODIFIED Requirements

### Requirement: REQ-DIST-002 Config file and init
`spec-ctx.toml` SHALL hold `[scan]`, `[ids] caps`, `[ids] task_pattern`, `[bundle] budget`, `[bundle] depth`, `[verify] timeout_s`. Missing keys SHALL take defaults. `init` SHALL write a commented default file. `init --schema` SHALL install the schema and merge its config fragment. `init --skills` SHALL install the skills, `init --all` all three. `init` SHALL never replace `spec-ctx.toml`. Without `--force`, it SHALL keep and list each changed file.

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

#### Scenario: SCN-DIST-002-4 Existing files stay
- **WHEN** `spec-ctx.toml` and one skill file exist with other content and `init --all` runs without `--force`
- **THEN** it exits 0, both files keep their bytes, the output lists both as kept, the missing files exist, and the `next:` line names `--force`
