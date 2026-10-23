# Proposal

## Why

After four archives the index holds 806 entries and 197 requirement or scenario IDs appear twice: once in `openspec/specs/` and once in an archived change. `query`, `related` and `bundle` do not prefer one copy. `by_id` returns the archive copy, which will go stale the first time a main spec is edited. `query` matches only `id` and `title` with one substring, so `ctx query "push main"` returns nothing while the text "push to main" exists in three places. Query lines are cut at a fixed width and hide the `Verify:` clause. A bundle does not say where a block came from or why it was included. The engine is fast and consistent, but an agent that trusts it can read the wrong version of a requirement.

## What Changes

- One canonical entry per ID. Main specs win. Archive copies stay indexed with `status: archived` and are hidden from `query`, `related` and `bundle` unless `--all` is passed.
- Query matches the full text of an entry, not only the title. Several terms are combined with AND. Hits are ranked: ID match, then title, then text. Output is not cut.
- `related` and `bundle` carry provenance: file, line, status and the reason for inclusion.
- `bundle` includes the design decisions that reference the requested IDs.
- Every command detects a stale index and rebuilds it before answering.
- `status` says something useful when no change is active: last archived change and open questions from the handoff.
- `check` gains two rules: a code tag whose requirement is archived without a main copy, and a scenario with no test that names it.
- The bootstrap skill reads `open_questions` when no change is active.

Out of scope: semantic search, embeddings, a long running process, reading file contents into bundles for code entries.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `context-engine`: canonical entries, ranked query, provenance, stale detection, new check rules, status without active change.
- `session-bootstrap`: open questions step.

## Impact

- `tools/ctx/ctx.py` and `tests/ctx/`. Python stdlib only.
- `.ctx/index.json` gains fields. Consumers are the tests and the skill, both in this repo.
- Build time budget stays under 1 s on 2,000 files (REQ-CTX-003).
