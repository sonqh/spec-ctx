# Design

## Context

Everything here is packaging around a finished engine. The design questions are about defaults and about not surprising an OpenSpec user.

## Goals / Non-Goals

**Goals:**
- `npx spec-ctx init --schema` on a fresh `openspec init` project gives a working loop with no manual edits.
- The schema bundle validates with `openspec schema validate` and archives with `openspec archive` unchanged.
- agentrc runs on the published package, not on a local path.

**Non-Goals:**
- Replacing any OpenSpec command. spec-ctx sits beside OpenSpec.

## Decisions

- The schema is a fork, not a patch. `openspec schema fork spec-driven spec-driven-ids`, then edits. OpenSpec has no patch mechanism, and a fork is what their docs describe. Creates no ADR.
- Templates carry `REQ-<CAP>-NNN` placeholders and the instruction says to replace them with `specctx id new` output before writing. The engine's `check` catches a placeholder left behind as `missing-id`. Creates no ADR.
- Skills are generated from one source under `skills/` and copied to `.claude/skills` and `.agents/skills` by `init`. A test fails when the copies drift, like OpenSpec does. Creates no ADR.
- The GitHub Action runs `specctx check --strict`, both linters, and `openspec validate --all --strict`. It installs `spec-ctx` by version. Follows REQ-GOV-003.
- Python removal happens last, after agentrc runs on the npm package for one full change. Follows ADR-001.
- The upstream issue proposes stable IDs as the base fingerprint their parallel merge plan asks for, and links this repo as the proof. No PR until a maintainer invites one. Creates no ADR.

- D-release Release on version bump. The `release` workflow runs on push to `main` and publishes when `package.json` holds a version that npm does not have. The workflow creates the tags, because the git proxy of a Claude Code session rejects a tag push. A version bump is the release trigger, so the pre-commit hook rejects a bump outside a `release:` commit. Trade-off accepted on 2026-10-26: no manual tag step, in exchange for a guard on one field. Refs: REQ-DIST-004, REQ-GOV-007.

## Risks / Trade-offs

- OpenSpec schema format can change between versions. Mitigation: pin the OpenSpec version in the bundle README and test against it in CI.
- `npx skills add` layout can change. Mitigation: the skill folders follow the skills.sh spec and a CI step installs them into a temp dir.
