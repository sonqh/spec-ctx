# Design

## Context

The engine indexes every ID it finds. That was right while nothing was archived. Now the same requirement text exists twice and the two copies will diverge. The fix is a canonical pointer per ID plus visibility rules, not a second index.

## Goals / Non-Goals

**Goals:**
- An agent that asks for an ID gets the main spec text.
- A word that appears in a requirement body is findable.
- Every block in a bundle says where it came from.
- A stale index never answers a question.

**Non-Goals:**
- Ranking by semantics. Term match and position are enough at this size.
- Indexing file contents for code entries. Code stays `file:line`.

## Decisions

- Canonical selection by path: an ADDED or MODIFIED block in `openspec/changes/<active>/` beats `openspec/specs/`, which beats `openspec/changes/archive/`. A REMOVED block is never canonical. Each entry gets `canonical: true|false`. Alternative: drop archive copies from the index. Rejected because `check` needs them to detect reused IDs and to trace history. Refs: REQ-GOV-002.
- Query is a token AND over `id`, `title` and `text`. `text` is the requirement body and scenario bullets, lower-cased, stored in the index. Rank: ID match 3, title match 2, text match 1, summed per term. Ties sort by `id`. Alternative: regex. Rejected because agents type words. Creates no ADR.
- Provenance is one header line per block in `bundle`: `-- REQ-X-001 | openspec/specs/x/spec.md:12 | active | requested`. Reasons: `requested`, `scenario of <ID>`, `ref from <ID>`, `decision for <ID>`, `task cites <ID>`. Follows REQ-BOOT-003 on budget.
- Stale detection: the index stores the max mtime and the count of scanned files. A command compares that with a fresh walk (cheap, no parse). On mismatch it rebuilds and prints `index rebuilt` on stderr. Alternative: a file watcher. Rejected by ADR-003.
- Design decisions are indexed as kind `decision` with ID `<change>/D<n>` in order of appearance. They link to REQ IDs through `Refs:` lines only. Follows ADR-005.
- `status` with no active change prints the last archived change and the `open_questions` count and first lines from `.ctx/handoff.md`. Refs: REQ-BOOT-004.

## Risks / Trade-offs

- The index file grows with `text`. Mitigation: text is stored once per canonical entry. Measured budget: under 1 MB for this repo.
- Rebuild on stale adds up to 1 s to a command. Mitigation: the check is a stat walk, not a parse. Rebuild happens only on a real change.
- Tasks that reference archived IDs without a main copy are now findings. Mitigation: there are none today. `ctx check` lists them if they appear.
