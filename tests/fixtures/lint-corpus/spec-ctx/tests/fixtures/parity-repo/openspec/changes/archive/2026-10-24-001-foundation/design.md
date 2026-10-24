# Design

## Context

Greenfield repository. No code exists yet. See proposal.md for why. Six ADRs under `decisions/` fix the architecture before any adapter is written. The context engine and the bootstrap skill are built first because every later change is implemented by agents that need them.

## Goals / Non-Goals

**Goals:**
- Contracts stable enough that 002 to 004 do not reopen them.
- A working `ctx` CLI on day one, stdlib Python, under 400 lines.
- Golden-file test harness in place so adapters start with tests.

**Non-Goals:**
- Any agent-specific rendering.
- Windows paths.
- Performance beyond the 1 s build target.

## Decisions

- Profile validation with zod, JSON Schema exported by `zod-to-json-schema`. Alternative: hand-written JSON Schema and ajv. Rejected because two sources of truth drift. Creates no new ADR, follows ADR-001.
- IntermediateConfig is a plain JSON object with a TypeScript type and a zod schema, not a class. Alternative: a class with methods. Rejected because adapters must stay pure functions over data (ADR-002).
- Verbosity and other prose blocks live as markdown files under `src/ic/blocks/` and are read at build time into a generated TS module. Alternative: inline strings. Rejected because the blocks must pass the ste-humanize lint like any other markdown (ADR-006).
- The context engine is Python, not TypeScript. Alternative: a TS CLI in the same package. Rejected because `ctx` must run before `npm install` in a fresh clone and in the pre-commit hook. Python 3 is on every target machine. Follows ADR-005.
- Index is a single sorted JSON file at `.ctx/index.json`, gitignored. Alternative: SQLite. Rejected because the repo is small and a diff-able file is easier to debug. Reopen if build time passes 1 s.
- Refs are parsed only from lines that start with `Refs:`. Alternative: scan all text for IDs. Rejected because prose mentions an ID without meaning a dependency, and that noise defeats `related`.
- Bootstrap skill is a markdown skill, not a hook. Alternative: a `SessionStart` hook that prints the bundle. Rejected for now because a hook cannot know which task the user wants. Reopen in 005 if sessions keep skipping the skill.

## Risks / Trade-offs

- [Agents ignore the bootstrap skill and read specs directly] → CLAUDE.md states the rule in its first lines, and `openspec/config.yaml` repeats it in `operations.apply.guidance`.
- [Refs lines go stale as specs move] → `ctx check` runs in pre-commit and CI.
- [Profile schema too rigid for real users] → v0 is explicit about defaults. `import` in 003 will show what real configs need.
- [Prose blocks drift between agents] → one block file per setting, rendered by every adapter.

## Migration Plan

Not applicable. First change in a new repository.

## Open Questions

- Whether `report_format` needs a third value for PR descriptions. Safe to defer. It adds a block file and an enum member, nothing else.
