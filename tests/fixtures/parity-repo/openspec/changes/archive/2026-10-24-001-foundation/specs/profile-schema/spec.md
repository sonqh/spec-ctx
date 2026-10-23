# Spec Delta

## Purpose

Defines the profile file that describes who the user is and how they want AI coding agents to behave. The profile is the only hand-edited input to agentrc.

## ADDED Requirements

### Requirement: REQ-PROF-001 Profile location
agentrc SHALL read the profile from `$AGENTRC_HOME/profile.yaml`. When `AGENTRC_HOME` is unset, the path SHALL be `~/.agentrc/profile.yaml`. A `--profile <path>` flag SHALL override both.

Refs: ADR-001

#### Scenario: SCN-PROF-001-1 Default path
- **WHEN** `AGENTRC_HOME` is unset and no `--profile` flag is given
- **THEN** agentrc reads `~/.agentrc/profile.yaml`

#### Scenario: SCN-PROF-001-2 Flag wins over env
- **WHEN** `AGENTRC_HOME=/x` and `--profile /y/p.yaml` are both set
- **THEN** agentrc reads `/y/p.yaml`

#### Scenario: SCN-PROF-001-3 Missing file
- **WHEN** the resolved path does not exist
- **THEN** agentrc exits with code 2 and prints the path it looked for and the command `agentrc init`

### Requirement: REQ-PROF-002 Schema version
The profile SHALL declare `schema: agentrc/v0` as its first key. agentrc SHALL reject a profile whose `schema` value is missing or unknown.

#### Scenario: SCN-PROF-002-1 Unknown version
- **WHEN** the profile says `schema: agentrc/v9`
- **THEN** agentrc exits with code 2 and names the supported versions

### Requirement: REQ-PROF-003 Required sections
A valid profile SHALL contain the sections `identity`, `working_style`, `risk`, `workflow`, `extensions`, and `agents`. Each section SHALL be an object. A missing section SHALL fail validation with the section name in the message.

#### Scenario: SCN-PROF-003-1 Missing section
- **WHEN** the profile has no `risk` section
- **THEN** validation fails and the message contains `risk`

### Requirement: REQ-PROF-004 identity fields
`identity` SHALL contain `name` (string), `role` (one of `junior`, `mid`, `senior`, `staff`, `pm`, `researcher`), `languages` (list of strings), `frameworks` (list of strings), and `platform` (one of `macos`, `linux`, `windows`).

#### Scenario: SCN-PROF-004-1 Bad role
- **WHEN** `identity.role` is `wizard`
- **THEN** validation fails and the message lists the allowed roles

#### Scenario: SCN-PROF-004-2 Empty languages
- **WHEN** `identity.languages` is an empty list
- **THEN** validation passes and compile emits no language rule files

### Requirement: REQ-PROF-005 working_style fields
`working_style` SHALL contain `autonomy` (`low`, `medium`, `high`), `verbosity` (`terse`, `normal`, `explanatory`), `explanations` (`skip-basics`, `teach`), `report_format` (`result-first`, `narrative`), and `diagrams` (`mermaid`, `none`). Each field SHALL have a default used when the key is absent.

#### Scenario: SCN-PROF-005-1 Defaults
- **WHEN** `working_style` is an empty object
- **THEN** the loaded profile has `autonomy: medium`, `verbosity: normal`, `explanations: teach`, `report_format: result-first`, `diagrams: mermaid`

### Requirement: REQ-PROF-006 risk fields
`risk` SHALL contain `sandbox` (`none`, `recommended`, `required`), `destructive_ops` (`block`, `confirm`, `allow`), `secrets_read` (`deny`, `allow`), and `project_mcp_autoload` (boolean). Defaults SHALL be `recommended`, `confirm`, `deny`, `false`.

#### Scenario: SCN-PROF-006-1 Autonomy high requires sandbox
- **WHEN** `working_style.autonomy` is `high` and `risk.sandbox` is `none`
- **THEN** validation fails and the message says `autonomy: high` requires `sandbox: required` or `recommended`

### Requirement: REQ-PROF-007 workflow fields
`workflow` SHALL contain `git` (`feature-branch`, `trunk`), `tests` (`risk-based`, `always-full`, `none`), and `review` (string naming a catalog command, or `none`).

#### Scenario: SCN-PROF-007-1 Unknown review command
- **WHEN** `workflow.review` names a command not present in `extensions.commands`
- **THEN** validation warns and compile continues

### Requirement: REQ-PROF-008 extensions fields
`extensions` SHALL contain `skills`, `mcp`, and `commands`, each a list of catalog references in the form `<source>/<name>` or `<source>/<name>@<ref>`. A reference without `@<ref>` SHALL mean the latest ref at resolve time.

Refs: REQ-CAT-001

#### Scenario: SCN-PROF-008-1 Malformed reference
- **WHEN** `extensions.skills` contains `brainstorm`
- **THEN** validation fails and the message shows the expected form `<source>/<name>`

### Requirement: REQ-PROF-009 agents fields
`agents` SHALL be a map from agent id (`claude-code`, `codex`, `cursor`, `gemini-cli`) to an object with `enabled` (boolean) and optional `config_dir` (string). An unknown agent id SHALL fail validation.

#### Scenario: SCN-PROF-009-1 Unknown agent
- **WHEN** `agents` has a key `copilot`
- **THEN** validation fails and the message lists the known agent ids

### Requirement: REQ-PROF-010 JSON Schema export
agentrc SHALL ship `schema/profile.schema.json`, generated from the same validator, so editors can autocomplete `profile.yaml`. The schema SHALL carry `$id` and the version string.

#### Scenario: SCN-PROF-010-1 Schema matches validator
- **WHEN** a profile passes the validator
- **THEN** it also passes `schema/profile.schema.json`, and the reverse holds for the fixtures in `tests/fixtures/profiles/`

### Requirement: REQ-PROF-011 Validation output
`agentrc validate` SHALL print every error with a JSON path (`risk.sandbox`), the bad value, and the allowed values. With `--json` it SHALL print an array of `{path, message, allowed}`.

#### Scenario: SCN-PROF-011-1 Two errors at once
- **WHEN** the profile has two invalid fields
- **THEN** both are printed in one run and the exit code is 2
