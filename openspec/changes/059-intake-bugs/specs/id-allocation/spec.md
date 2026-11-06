## ADDED Requirements

### Requirement: REQ-IDS-006 Repeat call before build
`specctx id new` SHALL read the index and reserve nothing (ADR-003). A second call with the same arguments before `build` SHALL print the same ID. The help page of `id new` and the `specctx-run` skill SHALL say so. Both SHALL name `--count <n>` as the way to get several IDs of one kind.

Refs: REQ-IDS-001, REQ-IDS-002, ADR-003

#### Scenario: SCN-IDS-006-1 Same ID twice
- **WHEN** `specctx id new SCN IDX --for REQ-IDX-004` runs twice with no `build` between
- **THEN** both calls print the same ID, and `--count 2` prints two different IDs

#### Scenario: SCN-IDS-006-2 Help and skill name the count flag
- **WHEN** `specctx id new --help` runs and the `specctx-run` skill is read
- **THEN** both say that a repeat call before `build` prints the same ID, and both name `--count`
