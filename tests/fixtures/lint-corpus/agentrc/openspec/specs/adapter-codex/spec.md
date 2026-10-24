# adapter-codex Specification

## Purpose
Defines the files agentrc writes for Codex CLI and the TOML merge rules that keep the user's own config intact.

## Requirements

### Requirement: REQ-CDX-001 Config directory
The adapter SHALL resolve its directory per REQ-ADPT-003 with env var `CODEX_HOME` and default `~/.codex`. `detect()` SHALL report `installed: true` when the `codex` binary is on PATH or the directory exists.

Refs: REQ-ADPT-003

#### Scenario: SCN-CDX-001-1 CODEX_HOME honored
- **WHEN** `CODEX_HOME=/tmp/x`
- **THEN** every artifact path starts with `/tmp/x` except skills, which go to `~/.agents/skills`

### Requirement: REQ-CDX-002 AGENTS.md managed block
The adapter SHALL render `<dir>/AGENTS.md` as a managed-block artifact containing `instructions.global` followed by every rule body under a heading `## <rule id>` with its globs listed on one line. Codex has no path-scoped loading, so rules are inlined.

Refs: REQ-IC-003

#### Scenario: SCN-CDX-002-1 Rules inlined
- **WHEN** the IC has two rules
- **THEN** `AGENTS.md` contains two `## ` headings inside the block, one per rule

### Requirement: REQ-CDX-003 config.toml merge
The adapter SHALL render `<dir>/config.toml` with `write: merge-toml`. It SHALL set `sandbox_mode` and `approval_policy` from `risk` and `working_style.autonomy`, and `[mcp_servers.<id>]` tables from IC mcp items. Tables and keys agentrc does not own SHALL be preserved byte-for-byte where the TOML library allows, and semantically otherwise.

Refs: REQ-IC-006, REQ-PROF-006

#### Scenario: SCN-CDX-003-1 Foreign table kept
- **WHEN** `config.toml` has `[profiles.work]` not managed by agentrc
- **THEN** after apply the table is present with the same keys and values

#### Scenario: SCN-CDX-003-2 Sandbox mapping
- **WHEN** `risk.sandbox` is `required` and `autonomy` is `high`
- **THEN** `sandbox_mode = "workspace-write"` and `approval_policy = "on-failure"`

### Requirement: REQ-CDX-004 Destructive ops without hooks
Codex has no hook mechanism in this change. When the IC has hooks, the adapter SHALL append a rule text block to `AGENTS.md` describing each blocked action and SHALL record a degradation `{agent: codex, requirement: hooks}`.

Refs: REQ-IC-008

#### Scenario: SCN-CDX-004-1 Degradation recorded
- **WHEN** `risk.destructive_ops` is `block`
- **THEN** `degradations` contains the codex hooks entry and `AGENTS.md` names `rm -rf` and push to main as forbidden

### Requirement: REQ-CDX-005 Skills location
Skills SHALL be copied to `~/.agents/skills/<id>/`, the shared location Codex reads. The adapter SHALL not write under `<dir>/skills`.

Refs: REQ-IC-007

#### Scenario: SCN-CDX-005-1 Shared path
- **WHEN** the IC has one skill
- **THEN** it appears at `~/.agents/skills/<id>/SKILL.md`

### Requirement: REQ-CDX-006 Capability table
The adapter SHALL report `instructions, mcp, skills: true` and `rulesWithPaths, hooks, permissions, subagents: false`.

Refs: REQ-ADPT-002

#### Scenario: SCN-CDX-006-1 Permissions degraded
- **WHEN** `risk.secrets_read` is `deny`
- **THEN** `degradations` contains `{agent: codex, requirement: permissions}` and `AGENTS.md` lists the paths as do-not-read
