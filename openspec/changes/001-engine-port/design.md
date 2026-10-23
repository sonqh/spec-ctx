# Design

## Context

The Python engine is 600 lines of regex, file walks, and JSON. Its behavior is defined by 63 unit tests and by six archived OpenSpec specs in agentrc (REQ-CTX-001 to REQ-CTX-012). The port keeps that behavior and adds a config file so another project can use it.

## Goals / Non-Goals

**Goals:**
- Byte-identical index and command output against the Python engine on the parity fixture.
- Build under 1 s on 2,000 files on Node 22.
- Zero Bun-only APIs. Runs with `node dist/cli.js`.

**Non-Goals:**
- New features beyond the Python engine. They go in 002.
- Semantic search.

## Decisions

- Config lives in `spec-ctx.toml` at the project root, parsed with `smol-toml`. Alternative: a key in `openspec/config.yaml`. Rejected because that file is OpenSpec's and a YAML parser would add a dependency. Follows ADR-001.
- Module layout: `src/index/` (scan, canonical, stale), `src/graph/` (related, bundle), `src/check/`, `src/cli/`. Each CLI command imports its module lazily so `--version` loads nothing heavy. Follows the OpenSpec startup rule. Creates no ADR.
- Determinism: entries are sorted by `id` then `file`. JSON is written with two-space indent and a trailing newline. Digests are sha256 hex. Follows ADR-003.
- Parity test harness: `tests/parity/run.sh` runs both engines on `tests/fixtures/parity-repo/` and diffs the outputs of eight commands. The Python engine is the oracle until 003 deletes it. Creates no ADR.
- Stale detection stores `scanned.count` and `scanned.newest_mtime_ms`. The walk uses `fs.statSync` only. Follows ADR-003.
- Capability codes come from config. The regex `REQ-([A-Z]{2,6})-(\d{3})` accepts any code. `check` reports a code that the config does not list. Follows ADR-002.

## Risks / Trade-offs

- mtime resolution differs across filesystems. Mitigation: compare count and newest mtime in integer milliseconds, and treat equal as fresh.
- Node and Bun sort strings the same way for ASCII. Non-ASCII titles could differ. Mitigation: sort by code point with a comparator, not locale.
- The Python oracle has bugs that the port would copy. Mitigation: a parity failure that is a Python bug is fixed in both and noted in `docs/verification/001.md`.
