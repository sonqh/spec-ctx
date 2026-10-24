# ADR-004 Catalog content is external and pinned by digest

Status: accepted. Date: 2026-10-23.

## Decision

agentrc does not ship skills, commands, agents, or MCP definitions. It resolves them from external sources (claude-code-templates, skills.sh) by `source@ref`, computes a digest, and records the digest in the lockfile.

## Why

- claude-code-templates has 30k stars. A new catalog would not win.
- A digest makes a rebuild reproducible even when upstream changes.

## Consequences

- Offline `apply` works from the cache only when every digest is present.
- A missing or changed digest is an error, not a silent update.

Refs: REQ-CAT-001, REQ-CAT-003, REQ-APPLY-005
