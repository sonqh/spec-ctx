# Design

## Context

001 delivers the profile, the IC, the adapter contract, and the test harness. This change adds the first two adapters and the pipeline that writes to disk. The user's home directory is the production environment, so every write path is guarded. See proposal.md.

## Goals / Non-Goals

**Goals:**
- End-to-end `agentrc init` on a machine with Claude Code and Codex installed.
- A user can read every change before it happens and undo it afterwards.
- Golden files for both adapters across five reference profiles.

**Non-Goals:**
- Cursor and Gemini CLI.
- Fetching catalog items. 002 compiles only items already in `~/.agentrc/cache`.
- Windows.

## Decisions

- Managed block delimiters are comment lines in each format: `<!-- BEGIN agentrc -->` for markdown, `# BEGIN agentrc` for TOML. JSON gets a top-level `_agentrc` key instead. Alternative: own the whole file. Rejected because users keep their own notes in CLAUDE.md (ADR-001).
- JSON merge owns a fixed key list per adapter (`permissions.deny`, `hooks`, `enableAllProjectMcpServers`, `outputStyle`, `mcpServers.<managed>`). Everything else is copied through. Alternative: three-way merge with the last lockfile. Rejected for 002 as too complex. Reopen when drift reports show users editing owned keys.
- TOML merge uses `smol-toml` parse, structural merge of owned tables, and re-serialize. Comments in foreign tables may be lost. Alternative: a comment-preserving TOML editor. None exists in the ecosystem with Node 22 support. Recorded as risk.
- Hooks are rendered as `jq` one-liners reading `.tool_input.command`, matching the pattern trailofbits uses, so a user can read them. Alternative: a shipped hook script. Rejected because a script needs a stable path and the user then depends on agentrc staying installed.
- Backups are full copies, not diffs. Ten sets max. Alternative: git in the config dir. Rejected because users have their own repos there.
- `apply` writes files in adapter order and artifacts in path order, and writes the lockfile last. Partial failure leaves a readable state and no lockfile, so `status` reports every artifact as unknown rather than lying.

## Risks / Trade-offs

- [TOML comments lost in foreign tables] → print a warning when the input had comments, and keep a backup.
- [Hook `jq` dependency missing] → `detect()` checks for `jq` and compile records a degradation with instructions to install it.
- [User edits inside a managed block] → `status` shows drift, `plan --diff` shows exactly what apply would overwrite.
- [Path traversal from a bad catalog item path] → every artifact path must resolve under the agent config dir or `~/.agents/skills`, checked before write.

## Migration Plan

New install only. No migration.

## Open Questions

- Whether `init` should run `plan` with `--diff` by default on first run. Defer to 003 when the TUI exists.
