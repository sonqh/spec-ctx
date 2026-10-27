# Proposal

## Why

`specctx init --schema` repairs config items that YAML reads as mappings. 013/D2 says the repair needs no `--force`. But `init` exits 2 when `spec-ctx.toml` exists, before it reaches the repair. Every project that already uses spec-ctx has that file. So the repair is reachable only with `--force`, and `--force` also replaces every bundle file that the user changed. Two projects showed it on 2026-10-27: agentrc and ste-humanize-skill.

## What Changes

- `init` keeps an existing `spec-ctx.toml` with or without `--force`. It no longer exits 2 for that file.
- Without `--force`, `init` keeps every file that exists with other content. It prints one `kept` line for each, writes the missing files, and merges and repairs `openspec/config.yaml`. It exits 0.
- When it keeps a changed file, the `next:` line names the same command with `--force`.
- With `--force`, `init` replaces the changed files as today. `spec-ctx.toml` still stays.
- REQ-DIST-002 gets the new rule and SCN-DIST-002-4. REQ-SCH-003 gets SCN-SCH-003-4.

Out of scope: the content of the bundle, `adopt`, and the merge rules for config keys.

## Capabilities

### Modified Capabilities
- `distribution`: REQ-DIST-002.
- `schema-bundle`: REQ-SCH-003.

## Impact

- `src/init/init.ts`, the `init` command output and help, `tests/init/init.test.ts`, `CHANGELOG.md`.
