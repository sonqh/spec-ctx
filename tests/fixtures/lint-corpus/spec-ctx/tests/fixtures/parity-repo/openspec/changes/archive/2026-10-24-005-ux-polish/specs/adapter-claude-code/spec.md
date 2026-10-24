# adapter-claude-code

## MODIFIED Requirements

### Requirement: REQ-CLD-006 MCP merge
MCP items SHALL be rendered into `~/.mcp.json` under `mcpServers` with `write: merge-json`. This file is the one allowed path outside the Claude config dir, because Claude Code reads global servers from there. Servers not managed by agentrc SHALL be kept. A managed server SHALL carry `"_agentrc": "<digest>"`.

Refs: REQ-IC-006, REQ-CLD-001

#### Scenario: SCN-CLD-006-1 Unmanaged server kept
- **WHEN** `~/.mcp.json` has a server `local-db` with no `_agentrc` key
- **THEN** after apply `local-db` is unchanged

#### Scenario: SCN-CLD-006-2 Only exception
- **WHEN** the path guard checks every Claude Code artifact
- **THEN** every path is under the config dir except `~/.mcp.json`
