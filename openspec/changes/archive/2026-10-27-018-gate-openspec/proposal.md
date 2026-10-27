# Proposal

## Why

A first external user ran the fresh path with a fork of OpenSpec. The friction section of `docs/spec-ctx-fresh-path-transcript.md` in that repo holds three cuts that spec-ctx can close. `gate` runs `npx -y @fission-ai/openspec@latest validate` unless the env var `SPECCTX_OPENSPEC` names another command. A project on a fork, a pinned version, or a global install has no durable place to say which build the gate runs. The README fresh block shows `openspec init` with no tool flag. The command opens an interactive picker, and a stranger who reads a log sees it hang. And `init --all` ends with `next: specctx status`, so nobody learns where the templates with the ID placeholders are. The earlier run in `docs/dogfood/openspec.md` hit the first item too.

## What Changes

- `spec-ctx.toml` gets `[gate] openspec`, a string with the command that runs OpenSpec. The default is `npx -y @fission-ai/openspec@latest`. `gate` runs `<command> validate --all` with it. The env var `SPECCTX_OPENSPEC` still overrides the key, for tests and one-off runs. `init` writes the key with a comment.
- The README fresh block shows `openspec init --tools <tool>` and says that `--no-animation` keeps logs clean. The existing path section says that `gate` runs the command in `[gate] openspec` and names the global install case.
- `init` prints one `templates:` line before `next:` when the schema step ran. It names `openspec/schemas/spec-driven-ids/templates/` and the two files that hold the ID placeholders.
- REQ-CLI-004 gets SCN-CLI-004-6. REQ-DIST-002 gets SCN-DIST-002-9. REQ-SCH-003 gets SCN-SCH-003-5.

Out of scope: the other friction items of the transcript, such as the propose skill and `specctx id new`, the `task next` exit code, and the handoff after archive.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `cli`: REQ-CLI-004.
- `distribution`: REQ-DIST-002.
- `schema-bundle`: REQ-SCH-003.

## Impact

- `src/config.ts`, `src/cli/gate.ts`, `src/cli/commands.ts`, `src/init/init.ts`, `src/cli/help.ts`.
- `tests/config.test.ts`, `tests/cli/gate.test.ts`, `tests/init/init.test.ts`, `tests/fixtures/help-golden/`.
- `README.md`, `CHANGELOG.md`.
