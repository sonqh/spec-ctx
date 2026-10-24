# Design

## Context

003 completed the user-facing flow. Items still had to be placed in the cache by hand. This change adds fetching behind the existing cache and lockfile contracts. See proposal.md.

## Goals / Non-Goals

**Goals:**
- Reproducible installs from profile plus lockfile.
- No network in compile or apply.

**Non-Goals:**
- Dependency resolution between items.
- Signing or provenance beyond a content digest.

## Decisions

- Two source adapters behind one interface. `cct` uses a sparse git fetch of one path. `skills` shells out to `npx skills add` into a temp dir, because its layout is not documented as stable. Alternative: parse skills.sh HTML. Rejected as brittle.
- Canonical tar for digests. Alternative: hash file contents in sorted order. Rejected because a tar also captures paths and modes, which matter for skills with scripts. Follows ADR-004.
- Cache keyed by digest, not ref, so two refs with the same content share one directory.
- Content safety checks run before anything is copied into the cache.

## Risks / Trade-offs

- [`npx skills` changes its CLI] → pin the skills CLI version in package.json and test against it in CI weekly.
- [Large catalogs slow resolve] → fetch only items the profile names. Sparse checkout for `cct`.
- [User expects `apply` to fetch] → `apply` prints the exact `resolve` command when a digest is missing.

## Migration Plan

Existing lockfiles from 002 and 003 have no catalog section. `resolve` adds it. No other change.

## Open Questions

- Whether to support a `git+https://` source for private items. Defer to 005.
