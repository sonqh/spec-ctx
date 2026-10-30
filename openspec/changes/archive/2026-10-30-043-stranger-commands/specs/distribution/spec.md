## ADDED Requirements

### Requirement: REQ-DIST-015 Init under npx
When the env var `npm_command` is `exec`, `init` SHALL write `[cli] run = "npx -y spec-ctx@<version>"` with a comment into a new `spec-ctx.toml`. In any other environment it SHALL write no `[cli]` section. An existing `spec-ctx.toml` keeps its bytes, with or without `--force`, so an existing `[cli] run` stays.

Refs: REQ-DIST-002, REQ-CLI-010

#### Scenario: SCN-DIST-015-1 Init under npx
- **WHEN** `init` runs with `npm_command=exec` in a project with no `spec-ctx.toml`
- **THEN** the file has a comment and `run = "npx -y spec-ctx@0.4.0"` under `[cli]`, `loadConfig` reads it, and the `next:` line of `init` starts with `npx -y spec-ctx@0.4.0`

#### Scenario: SCN-DIST-015-2 Init elsewhere
- **WHEN** `init` runs with `npm_command` unset, or set to `run-script`
- **THEN** `spec-ctx.toml` has no `[cli]` section and the default `specctx` applies

#### Scenario: SCN-DIST-015-3 Existing key stays
- **WHEN** `spec-ctx.toml` holds `[cli] run = "bunx spec-ctx"` and `init --all --force` runs with `npm_command=exec`
- **THEN** the file keeps its bytes and the `next:` line starts with `bunx spec-ctx`
