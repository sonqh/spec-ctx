# Proposal

## Why

After 001 and 002 the engine and the workflow exist, but only inside this repo. A user needs three things to adopt it in an OpenSpec project in ten minutes. A schema bundle that writes IDs into every artifact. Skills that teach the agent the loop. A package they can run with `npx`. This change ships those, migrates agentrc to them as the first real user, and drafts the upstream issue for OpenSpec.

## What Changes

- Schema bundle `spec-driven-ids`: a fork of `spec-driven` whose templates carry ID placeholders and whose instructions call `specctx id new` and write `Verify:` as a code span.
- Skills `specctx-bootstrap`, `specctx-next`, `specctx-done`, installable with `npx skills add sonqh/spec-ctx`.
- npm publish of `spec-ctx` with `bin specctx`, a `bun build --compile` binary per platform in GitHub Releases, and a reusable GitHub Action.
- `specctx init --schema` writes `spec-ctx.toml`, installs the schema into `openspec/schemas/`, and installs the skills into `.claude/skills` and `.agents/skills`.
- Migration of agentrc: remove `tools/ctx/ctx.py`, add `spec-ctx.toml`, switch hooks and CI, backfill evidence.
- Remove the Python engine from this repo after parity holds for both changes.
- README with a 60 second demo, and `docs/upstream-issue.md` for OpenSpec.

Out of scope: a VS Code extension, a web dashboard, multi-agent task claims.

## Capabilities

### New Capabilities
- `schema-bundle`: the templates and instructions.
- `skills`: the three skills and their install.

### Modified Capabilities
- `distribution`: publish, binary, action, init.

## Impact

- agentrc repository gains `spec-ctx.toml` and loses `tools/ctx/`.
- This repo loses `tools/ctx/` and `tests/parity/` after the removal task.
