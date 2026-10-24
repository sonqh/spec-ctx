# Proposal

## Why

agentrc needs its contracts before any adapter is written. The profile schema, the intermediate config, and the adapter interface decide every later change. The project also needs its own working tools from day one. An ID scheme. A context engine over the specs. A bootstrap skill, so a fresh agent session starts with the right context instead of reading the whole repo.

## What Changes

- Define `profile.yaml` v0: fields, enums, defaults, and the JSON Schema that editors use.
- Define `IntermediateConfig`: the agent-independent structure that `compile` produces.
- Define the `AgentAdapter` contract and the `Artifact` write modes.
- Add the context engine `tools/ctx/ctx.py`: build, query, related, bundle, check.
- Add the `bootstrap-context` skill for fresh sessions.
- Add spec governance: ID scheme, Refs links, writing style, lint in CI.
- Add CLAUDE.md so every agent session uses the engine and the skills.

Out of scope: any adapter, `apply`, the TUI, the catalog resolver. Those are changes 002 to 004.

## Capabilities

### New Capabilities
- `profile-schema`: what a valid profile is, where it lives, how it is validated.
- `intermediate-config`: the agent-independent output of compile.
- `adapter-contract`: what every agent adapter must expose and guarantee.
- `context-engine`: indexing and retrieval of spec, decision, task, code, and test IDs.
- `session-bootstrap`: how a fresh agent session loads the minimum context.
- `spec-governance`: IDs, links, writing style, and the checks that enforce them.

### Modified Capabilities
None.

## Impact

- New files: `openspec/specs/*`, `decisions/ADR-001..006`, `tools/ctx/ctx.py`, `.claude/skills/bootstrap-context/SKILL.md`, `CLAUDE.md`, `schema/profile.schema.json`, `src/profile/`, `src/ic/`, `src/adapters/types.ts`.
- New dev dependencies: zod, vitest. No runtime dependency beyond Node 22 or bun.
- CI: `openspec validate --all --strict`, `ctx check --strict`, `tells-lint.py` and `ste-lint.py` on markdown.
