# Proposal

## Why

The context engine that agentrc built under `tools/ctx/ctx.py` works: canonical entries, ranked query, budgeted bundles, provenance, stale detection, 63 tests. It is also stuck inside one repo, hardcodes that repo's paths and capability codes, and needs `python3` on the user's machine. OpenSpec, skills.sh, and the agents that would call it are all TypeScript. This change ports the engine to TypeScript as the `specctx` CLI, driven by a config file, with the Python tests as the parity contract.

## What Changes

- A new package `spec-ctx` with the bin `specctx`. Bun for development, Node 22 at run time (ADR-001).
- A config file `spec-ctx.toml` at the project root: paths to scan, capability codes, task ID pattern, budget defaults.
- Commands with the same output as the Python engine: `build`, `status`, `query`, `related`, `bundle`, `check`.
- Every command rebuilds a stale index first.
- A parity suite. Both engines run on the same fixture tree. They must print the same index and the same command output.
- CI on Bun and Node 22, both linters, OpenSpec strict validate.

Out of scope: ID allocation, task state, Verify runner, handoff, schema bundle, skills, npm publish. Those are changes 002 and 003.

## Capabilities

### New Capabilities
- `index`: what gets scanned, the record shape, canonical selection, stale detection.
- `query`: `query`, `related`, `bundle` output and ranking.
- `check`: integrity rules and strict rules.
- `cli`: command surface, flags, exit codes, output style.
- `distribution`: config file, package layout, runtime compatibility.
- `spec-governance`: the rules this repo holds itself to.

### Modified Capabilities
None.

## Impact

- New: `src/`, `tests/`, `tests/parity/`, `spec-ctx.toml`, `package.json`.
- `tools/ctx/ctx.py` stays until 003 removes it. It is the bootstrap tool for sessions on this repo until the port lands.
- Runtime dependency: `smol-toml`. Dev: `vitest` or `bun test`, `typescript`.
