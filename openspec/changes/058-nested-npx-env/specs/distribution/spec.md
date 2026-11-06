## ADDED Requirements

### Requirement: REQ-DIST-016 Child environment under npx
A child that may run `npx` SHALL get a copy of the environment without `npm_config_package` and `npm_config_call`. One pure function SHALL make the copy. It applies to the `gate` validate step, the `init` version probe, the status probe of `next`, and the Verify runner, also for an env that a caller passes. Every other variable stays. The git spawns of `gate --rerun` SHALL not change.

Refs: REQ-DIST-002, REQ-CLI-004, REQ-LOOP-001, REQ-VER-001

#### Scenario: SCN-DIST-016-1 Gate under nested npx
- **WHEN** the environment holds `npm_config_package` and `npm_config_call`, and `[gate] openspec` names a script that exits 1 when its own environment holds `npm_config_package`
- **THEN** `gate --strict` prints `validate: ok (strict)` and exits 0

#### Scenario: SCN-DIST-016-2 Init probe under nested npx
- **WHEN** `init` runs with both variables in its environment and a fake `npx` on PATH that exits 1 when its own environment holds `npm_config_package` and prints `9.9.9` otherwise
- **THEN** `spec-ctx.toml` has `openspec = "npx -y @fission-ai/openspec@9.9.9"` and the output has no `note:` line

#### Scenario: SCN-DIST-016-3 Status probe under nested npx
- **WHEN** the environment holds both variables and the OpenSpec command is a script. The script exits 1 when its own environment holds `npm_config_package`. Otherwise it prints a complete plan
- **THEN** the status probe of `next` returns `ok: true` with `isPlanningComplete: true`

#### Scenario: SCN-DIST-016-4 Verify under nested npx
- **WHEN** the environment holds both variables and a Verify command is `test -z "$npm_config_package" && test -z "$npm_config_call"`
- **THEN** the Verify runner reports exit 0, with no env passed and with an env passed that holds both variables

#### Scenario: SCN-DIST-016-5 The helper
- **WHEN** the helper gets an object with the two variables, `npm_command`, and `PATH`
- **THEN** the result lacks the two variables, keeps `npm_command` and `PATH` with the same values, and the input object keeps every key. With no argument the helper reads `process.env`
