# Proposal

## Why

A verifier ran spec-ctx 0.4.0 from npm on a copy of an OpenSpec project, as a stranger. Every command that spec-ctx prints starts with bare `specctx`. That name is not on the PATH of someone who runs `npx -y spec-ctx`. Agents in this repository hit the same wall, because here `specctx` is `node dist/cli.js`, and they rewrite each printed command by hand. The npm page of the README also has dead relative links.

## What Changes

- A new config key `[cli] run`, default `specctx`. One function builds every command that spec-ctx prints to run: `next`, `status`, `check` hints, task hints, usage errors, the `blocked:` line, and the `Next:` lines of `init` and `adopt`. A source test fails on a bare `specctx <word>` string outside the help text.
- `init` writes `run = "npx -y spec-ctx@<version>"` when `npm_command` is `exec`. Elsewhere it writes nothing. An existing config is never changed.
- This repository sets `run = "node dist/cli.js"`.
- Every repository link and image in `README.md` becomes an absolute GitHub URL. A test fails on a relative one.
- The README says that `adopt --dry-run` exits 1 when headers need IDs. The exit code stays.

Out of scope:

- The help text, skills, and templates. They keep the name `specctx`.
- Capability codes of `adopt`.
- Legacy task noise in `check` and `next`.
- A version bump.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `cli`: REQ-CLI-010 added.
- `distribution`: REQ-DIST-015 added.
- `spec-governance`: REQ-GOV-011 added.

## Impact

- `src/config.ts`, `src/runcmd.ts`, `src/loop/`, `src/cli/`, `src/check/hints.ts`, `src/init/init.ts`.
- `spec-ctx.toml`, `README.md`, `CHANGELOG.md`, `docs/verification/043.md`.
- Output is the same when `[cli] run` is absent.
