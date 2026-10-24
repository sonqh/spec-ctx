# Proposal

## Why

001 fixed the contracts. agentrc now needs the two adapters and the apply pipeline that make it usable. Compile a profile. Render Claude Code and Codex files. Show a diff. Write with backups. Record a lockfile. This is the smallest end-to-end path a user can trust.

## What Changes

- Add the Claude Code adapter: `CLAUDE.md` managed block, `rules/*.md` with `paths:` frontmatter, `settings.json` merge for permissions and hooks, `~/.mcp.json` merge, skills directory.
- Add the Codex adapter: `AGENTS.md` managed block, `config.toml` merge for `[mcp_servers.*]` and `sandbox_mode`, `~/.agents/skills` directory.
- Add the apply pipeline: `plan`, `diff`, `apply`, `revert`, backups, managed blocks, lockfile.
- Add the CLI surface: `init` (compile and apply only, no TUI yet), `validate`, `plan`, `apply`, `revert`, `status`.

Out of scope: the elicitation TUI, `import`, catalog resolution, Cursor, Gemini CLI. Skills and MCP items are compiled only when already present in the cache. 004 adds fetching.

## Capabilities

### New Capabilities
- `adapter-claude-code`: what agentrc writes for Claude Code and how it merges.
- `adapter-codex`: what agentrc writes for Codex and how it merges.
- `apply-pipeline`: plan, diff, apply, revert, backups, lockfile.
- `cli`: command names, flags, exit codes, output formats.

### Modified Capabilities
None.

## Impact

- New: `src/adapters/claude-code/`, `src/adapters/codex/`, `src/apply/`, `src/cli/`.
- New dependency: `smol-toml` for TOML read and write, `diff` for unified diffs, `@clack/prompts` only for the apply confirmation.
- Writes to the user's home directory. Every write is preceded by a plan and a backup.
