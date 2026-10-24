# Proposal

## Why

Until now skills, commands, and MCP definitions had to be in the local cache by hand. This change lets a profile name them by `source/name@ref`. agentrc then fetches, verifies, pins, and caches them. A profile becomes reproducible on a new machine.

## What Changes

- Add `resolve`: fetch catalog items from two sources (claude-code-templates and skills.sh), compute digests, write to `~/.agentrc/cache/`.
- Pin digests in the lockfile and refuse to apply when a digest changed without a profile change.
- Add `update`: refresh refs that are unpinned, show what changed, update the lockfile.

Out of scope: a third source, publishing to a catalog, Cursor or Gemini.

## Capabilities

### New Capabilities
- `catalog-resolver`: fetching, verifying, caching, and pinning external items.

### Modified Capabilities
None.

## Impact

- New: `src/catalog/`. Network access during `resolve` and `update` only.
- `compile` reads the cache. `apply` reads the lockfile digests. Neither touches the network.
