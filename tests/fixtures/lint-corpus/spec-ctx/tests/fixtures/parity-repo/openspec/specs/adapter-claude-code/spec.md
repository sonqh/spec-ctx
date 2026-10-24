# adapter-claude-code Specification

## Purpose
Defines the files agentrc writes for Claude Code and the merge rules that keep the user's own content intact.

## Requirements

### Requirement: REQ-CLD-001 Config directory
The adapter SHALL resolve its directory per REQ-ADPT-003 with default `~/.claude`. `detect()` SHALL report `installed: true` when the `claude` binary is on PATH or the directory exists.

Refs: REQ-ADPT-003

#### Scenario: SCN-CLD-001-1 Env var honored
- **WHEN** `CLAUDE_CONFIG_DIR=/tmp/c` and the profile sets no `config_dir`
- **THEN** every artifact path starts with `/tmp/c`

### Requirement: REQ-CLD-002 Global CLAUDE.md managed block
The adapter SHALL render `<dir>/CLAUDE.md` as a managed-block artifact. The block SHALL contain `instructions.global` and an `@rules/` import line per rule. Text outside the block SHALL be preserved on every apply.

Refs: REQ-IC-003, REQ-ADPT-005

#### Scenario: SCN-CLD-002-1 User text preserved
- **WHEN** `CLAUDE.md` has user text above and below the block and apply runs
- **THEN** the user text is unchanged and only the block content changes

#### Scenario: SCN-CLD-002-2 No existing file
- **WHEN** `CLAUDE.md` does not exist
- **THEN** apply creates it with the block and nothing else

### Requirement: REQ-CLD-003 Path-scoped rules
Each `instructions.rules[]` entry SHALL become `<dir>/rules/<id>.md` with YAML frontmatter `paths:` listing the globs, followed by the body. Rule files SHALL be owned artifacts.

Refs: REQ-IC-003

#### Scenario: SCN-CLD-003-1 TypeScript rule
- **WHEN** the IC has a rule with id `lang-typescript`
- **THEN** `rules/lang-typescript.md` starts with `---`, has `paths:` with `**/*.ts`, and ends with the body

### Requirement: REQ-CLD-004 settings.json merge
The adapter SHALL render `<dir>/settings.json` with `write: merge-json`. It SHALL set `permissions.deny` from IC permissions, `hooks` from IC hooks (as `PreToolUse` command hooks with `jq` matchers), `enableAllProjectMcpServers` from `risk.project_mcp_autoload`, and `outputStyle` from verbosity. Keys agentrc does not own SHALL be left as found.

Refs: REQ-IC-004, REQ-IC-005

#### Scenario: SCN-CLD-004-1 Foreign keys kept
- **WHEN** `settings.json` already has `statusLine` and `cleanupPeriodDays`
- **THEN** after apply both keys are unchanged

#### Scenario: SCN-CLD-004-2 Hook rendering
- **WHEN** the IC has hook `block-push-main` with kind `block`
- **THEN** `settings.json` has a `PreToolUse` entry with matcher `Bash` whose command exits 2 on `git push` to main or master

### Requirement: REQ-CLD-005 Deny list format
Permission deny entries SHALL be rendered as `"Read(<pattern>)"` and `"Edit(<pattern>)"` strings in `permissions.deny`, deduplicated and sorted.

#### Scenario: SCN-CLD-005-1 Sorted and unique
- **WHEN** the IC has the same deny pattern twice
- **THEN** `permissions.deny` lists it once, in sorted position

### Requirement: REQ-CLD-006 MCP merge
MCP items SHALL be rendered into `~/.mcp.json` under `mcpServers` with `write: merge-json`. This file is the one allowed path outside the Claude config dir, because Claude Code reads global servers from there. Servers not managed by agentrc SHALL be kept. A managed server SHALL carry `"_agentrc": "<digest>"`.

Refs: REQ-IC-006, REQ-CLD-001

#### Scenario: SCN-CLD-006-1 Unmanaged server kept
- **WHEN** `~/.mcp.json` has a server `local-db` with no `_agentrc` key
- **THEN** after apply `local-db` is unchanged

#### Scenario: SCN-CLD-006-2 Only exception
- **WHEN** the path guard checks every Claude Code artifact
- **THEN** every path is under the config dir except `~/.mcp.json`

### Requirement: REQ-CLD-007 Skills
Each IC skill SHALL be copied to `<dir>/skills/<id>/` from its cache path. The directory SHALL be an owned artifact and SHALL be replaced whole on digest change.

Refs: REQ-IC-007

#### Scenario: SCN-CLD-007-1 Digest change
- **WHEN** a skill's digest changes in the lockfile
- **THEN** apply removes the old directory and copies the new one

### Requirement: REQ-CLD-008 Capability table
The adapter SHALL report `instructions, rulesWithPaths, hooks, mcp, skills, permissions: true` and `subagents: false` in this change.

Refs: REQ-ADPT-002

#### Scenario: SCN-CLD-008-1 No degradation for Claude Code
- **WHEN** a profile uses hooks, permissions, and rules
- **THEN** `degradations` has no entry for `claude-code`
