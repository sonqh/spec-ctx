# Proposal

## Why

The context engine and the bootstrap skill were built inside agentrc because agentrc needed them first. They now live in their own project, [sonqh/spec-ctx](https://github.com/sonqh/spec-ctx). The behavior is ported to TypeScript and parity tested. It is extended with ID allocation, a task state machine, evidence, and a generated handoff. Keeping the Python copy here means two sources of truth for one tool. The 17 requirements under `context-engine` and `session-bootstrap` describe spec-ctx, not agentrc.

## What Changes

- Retire the 12 REQ-CTX and 5 REQ-BOOT requirements. Each row in `retired-ids.md` names the spec-ctx requirement that replaced it.
- Remove `tools/ctx/`, `tests/ctx/`, and the Python test script from `package.json`.
- Add `spec-ctx.toml` with agentrc's capability codes and ignore globs.
- Switch the pre-commit hook and CI to `specctx`, installed from the spec-ctx git repository until the npm package is published.
- Replace the `bootstrap-context` skill with the three spec-ctx skills via `specctx init --skills`.
- Update `spec-governance` so the gate and the bootstrap are defined by spec-ctx.
- Backfill evidence for every archived task with `--manual "migrated"`, so `check --strict` passes.
- Update `CLAUDE.md`, `README.md`, and `DELEGATION.md` for the new loop.

Out of scope: any change to the agentrc CLI, the profile schema, or the adapters. Any change to spec-ctx itself.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `spec-governance`: the gate runs through spec-ctx.
- `context-engine`: all requirements removed.
- `session-bootstrap`: all requirements removed.

## Impact

- `tools/ctx/`, `tests/ctx/`, `.claude/skills/bootstrap-context/`, `.agents/skills/bootstrap-context` removed.
- `spec-ctx.toml`, `.ctx/evidence/`, `.ctx/handoff.md` added. `.ctx/index.json` stays out of git.
- CI gains the `sonqh/spec-ctx` action. The `code` job is unchanged.
