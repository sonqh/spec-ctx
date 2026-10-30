# Spec Delta

## ADDED Requirements


### Requirement: REQ-DIST-009 Invalid config gives one line
A `spec-ctx.toml` that is not valid TOML SHALL give one line on stderr and exit 2 in every command that reads the config, `init` included. The line SHALL hold the file path and the parse error message. One shared function SHALL load the config for all of them. No command SHALL print a stack for it.

Refs: REQ-DIST-002, REQ-CLI-002

#### Scenario: SCN-DIST-009-1 Init
- **WHEN** `spec-ctx.toml` holds `ids = [` and `init --schema` runs
- **THEN** stderr is one line with the file path and the parse error. The exit code is 2 and no stack line shows

#### Scenario: SCN-DIST-009-2 Other commands
- **WHEN** the same file exists and `next`, `check`, and `adopt` run
- **THEN** each prints the same one line on stderr and exits 2

#### Scenario: SCN-DIST-009-3 Other config errors
- **WHEN** `spec-ctx.toml` holds `brackets = "yes"` under `[ids]` and `init --schema` runs
- **THEN** stderr is one line that names `ids.brackets` and the exit code is 2
