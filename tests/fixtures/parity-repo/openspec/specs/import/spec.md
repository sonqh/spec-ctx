# import Specification

## Purpose
Defines how agentrc reads an existing Claude Code or Codex configuration and proposes a profile from it. A current user keeps their setup.

## Requirements

### Requirement: REQ-IMP-001 Sources read
`import` SHALL read `<claude dir>/CLAUDE.md`, `<claude dir>/settings.json`, `<claude dir>/rules/*.md`, `<claude dir>/skills/*/SKILL.md`, `~/.mcp.json`, `<codex dir>/AGENTS.md`, `<codex dir>/config.toml`, and `~/.agents/skills/*/SKILL.md`. It SHALL never read files matching the secrets patterns of REQ-APPLY-009.

Refs: REQ-ADPT-006, REQ-APPLY-009

#### Scenario: SCN-IMP-001-1 Secrets skipped
- **WHEN** `<codex dir>/auth.json` exists
- **THEN** import does not open it and the report lists it as skipped

### Requirement: REQ-IMP-002 Inference rules
`import` SHALL infer fields from these sources. `platform` from `process.platform`. `languages` from rule file names and `paths:` globs. `secrets_read: deny` when `permissions.deny` has `Read(~/.ssh/**)`. `destructive_ops: block` when a hook matches `rm -rf`. `sandbox` from `sandbox_mode`. `extensions.skills` from skill directory names. `extensions.mcp` from `mcpServers` keys. `agents` from which directories exist. Every inferred value SHALL carry a source path in the report.

#### Scenario: SCN-IMP-002-1 Deny rule found
- **WHEN** `settings.json` has `"Read(~/.ssh/**)"` in `permissions.deny`
- **THEN** the draft has `risk.secrets_read: deny` and the report cites `settings.json`

#### Scenario: SCN-IMP-002-2 Unknown skill source
- **WHEN** a skill directory has no recognizable source metadata
- **THEN** the draft lists it as `local/<name>` and the report marks it `needs source`

### Requirement: REQ-IMP-003 Draft output
`import` SHALL write `$AGENTRC_HOME/profile.draft.yaml` and print a report with three sections: inferred (field, value, source), defaulted (field, default), unresolved (what the user must decide). It SHALL not write `profile.yaml`.

Refs: REQ-ELIC-003

#### Scenario: SCN-IMP-003-1 Draft only
- **WHEN** import finishes
- **THEN** `profile.draft.yaml` exists and `profile.yaml` is unchanged or absent

### Requirement: REQ-IMP-004 Unmanaged content preserved
Text in `CLAUDE.md` or `AGENTS.md` that agentrc cannot map to a profile field SHALL stay in that file, above or below the managed block, untouched by apply. `import` SHALL print it in the report under `kept in place` with its file path. The draft SHALL not carry a `rules` entry for it. `init` SHALL print one line after apply that says the existing text stayed in place.

Refs: REQ-CLD-002, REQ-CDX-002

#### Scenario: SCN-IMP-004-1 Custom paragraph
- **WHEN** `CLAUDE.md` has a paragraph about a private monorepo
- **THEN** the report lists that paragraph under `kept in place` and after apply the paragraph is still in `CLAUDE.md`

### Requirement: REQ-IMP-005 Coverage target
On the five reference setups under `tests/fixtures/import/`, import SHALL infer at least 80 percent of the profile fields that those setups determine. The expected drafts SHALL be golden files.

#### Scenario: SCN-IMP-005-1 Golden drafts
- **WHEN** import runs on each fixture
- **THEN** the draft equals the golden file and the inferred count meets the threshold recorded in the fixture's `expected.json`

### Requirement: REQ-IMP-006 Next step line
The `import` report SHALL end with the line `Next: agentrc init` and one sentence that says the draft values become the defaults in the questions.

#### Scenario: SCN-IMP-006-1 Report tail
- **WHEN** `import` runs
- **THEN** the last two lines contain `Next: agentrc init` and the word `defaults`
