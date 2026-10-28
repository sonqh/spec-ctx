# adopt-existing (delta)

## ADDED Requirements

### Requirement: REQ-ADOPT-009 Paths on upstream OpenSpec
The path tests SHALL run upstream `@fission-ai/openspec@latest` with no fork. `tests/paths/fresh.sh` SHALL create its change with `openspec new change`, write the artifacts from the templates of the schema bundle, and close the tasks with `task done`. It SHALL end with `gate --strict` exit 0 and no edit of `spec-ctx.toml` after `init --all`. `docs/getting-started.md` SHALL show that path for a developer who knows OpenSpec, and the README SHALL link it.

Refs: ADR-006, REQ-ADOPT-006, REQ-SCH-003

#### Scenario: SCN-ADOPT-009-1 Fresh path with a change
- **WHEN** `tests/paths/fresh.sh` runs on an empty dir
- **THEN** it creates `add-greeting` from the templates, both tasks close with evidence, `openspec validate --all --strict` and `gate --strict` exit 0, and `spec-ctx.toml` has the bytes that `init --all` wrote

#### Scenario: SCN-ADOPT-009-2 Existing path on upstream
- **WHEN** `tests/paths/existing.sh` runs on the no-ID fixture
- **THEN** it runs `npx -y @fission-ai/openspec@latest` and ends with `gate --strict` exit 0

#### Scenario: SCN-ADOPT-009-3 Guide
- **WHEN** a reader opens `docs/getting-started.md`
- **THEN** it shows `openspec init --tools <tool>` and `spec-ctx@latest init --all`, says that a retitle needs a RENAMED block that `specctx check` prints, names no fork and no tarball, and the README links it
