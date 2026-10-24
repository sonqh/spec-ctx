# Proposal

## Why

One day of real use found four rough edges. Strict validate rejected two archives because a requirement grew past 500 characters, and nothing caught it before archive. A task whose Verify must run inside a fixture had to close with `--manual`. `status` picked the wrong "last archived" change when two were archived on one day. And the two markdown linters are Python, so every Node only user runs `gate` without them.

## What Changes

- `gate` checks every requirement in active deltas against the 500 character limit before archive.
- `Verify:` accepts a `cwd=<path>` prefix inside the code span.
- `status` orders archived changes by the archive time in `.openspec.yaml`, then folder name.
- The two linters are ported to TypeScript inside the package. The Python scripts stay as the oracle until parity holds, then leave.

Out of scope: new lint rules, changes to the rule texts, any OpenSpec behavior.

## Capabilities

### New Capabilities
- `linters`: the TypeScript port of `tells-lint` and `ste-lint`.

### Modified Capabilities
- `verify-runner`: the `cwd=` prefix.
- `cli`: the length check in `gate`, the archive order in `status`.

## Impact

- `src/lint/`, `tests/lint/`, `tests/fixtures/lint-golden/`.
- `gate` no longer needs `python3`. The `linters: skipped` branch goes away.
- agentrc and ste-humanize-skill can drop `scripts/*-lint.py` after this lands.
