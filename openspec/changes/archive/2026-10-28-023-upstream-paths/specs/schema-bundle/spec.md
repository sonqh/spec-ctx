# schema-bundle (delta)

## ADDED Requirements

### Requirement: REQ-SCH-005 Rules reach the stock schema
The `rules` and `operations` that `init --schema` merges into `openspec/config.yaml` SHALL reach the artifact instructions of the stock `spec-driven` schema. `tests/paths/rules-only.sh` SHALL prove it on upstream OpenSpec, so the schema copy can go in a later change.

Refs: ADR-006, REQ-SCH-003

#### Scenario: SCN-SCH-005-1 Rules only
- **WHEN** `openspec init` and `specctx init --schema` ran, `openspec/config.yaml` says `schema: spec-driven` again, and `openspec instructions specs --change <c> --json` runs
- **THEN** the `rules` list of the output and the plain text output both hold `specctx id new`
