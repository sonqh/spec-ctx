# Spec Delta

## MODIFIED Requirements


### Requirement: REQ-GOV-009 Archive guidance of this repository
`openspec/config.yaml` of this repository SHALL list under `operations.archive.guidance` every pre-archive step. The steps are `node dist/cli.js stats --write`, the README `## Measured` total row from the newest `docs/metrics/` file, the README `Archived:` line, the change in `## Unreleased` of `CHANGELOG.md`, `docs/verification/<NNN>.md`, and `bun run ci:local`. The rebuild line SHALL name `node dist/cli.js build`. The existing guidance lines SHALL stay.

Refs: REQ-SKL-003, REQ-GOV-004

#### Scenario: SCN-GOV-009-1 Guidance names every step
- **WHEN** the test reads `operations.archive.guidance` in `openspec/config.yaml`
- **THEN** it finds each of the six steps, and it finds the lines that name `check --strict`, `Rebuild the index`, and `openspec validate --all --strict`. The `Rebuild the index` line names `node dist/cli.js build`
