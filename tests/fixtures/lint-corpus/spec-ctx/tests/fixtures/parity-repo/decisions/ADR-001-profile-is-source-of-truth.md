# ADR-001 profile.yaml is the only source of truth

Status: accepted. Date: 2026-10-23.

## Decision

`profile.yaml` is the only hand-edited input. Every file agentrc writes to an agent config directory is derived from it and carries a generated marker.

## Why

- The surveyed tools (ruler, syncode, dot-agents, agent-rules-sync) put files first. Users still write every rule by hand and keep N copies in sync.
- A profile answers the question "who are you" once. The compiler decides what each agent needs.

## Consequences

- A user who edits a generated file loses that edit on the next `apply`, unless the edit sits outside the managed block.
- `import` must exist, so an existing config can become a profile instead of being thrown away.

Refs: REQ-PROF-001, REQ-APPLY-003, REQ-IMP-001
