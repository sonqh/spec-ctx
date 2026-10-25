# id-allocation (delta)

## MODIFIED Requirements

### Requirement: REQ-IDS-001 Next ID
`specctx id new <REQ|SCN|ADR|DEC> <CAP> [--for <REQ-ID>]` SHALL print the next unused ID for that kind and code. Next SHALL be one more than the highest number among canonical entries, archived entries, and `retired-ids.md` for that code. For `SCN`, `--for` is required and the suffix `-<n>` is the next scenario number under it. With a non-empty `caps` list, `CAP` SHALL be in it or the command exits 2 with `unknown-cap` and a hint. An empty list accepts any `[A-Z]{2,6}` code.

Refs: ADR-002

#### Scenario: SCN-IDS-001-1 Next requirement
- **WHEN** the highest IDX requirement is `REQ-IDX-004` and `REQ-IDX-006` is retired
- **THEN** `specctx id new REQ IDX` prints `REQ-IDX-007`

#### Scenario: SCN-IDS-001-2 Next scenario
- **WHEN** `REQ-IDX-004` has scenarios `-1` to `-3`
- **THEN** `specctx id new SCN IDX --for REQ-IDX-004` prints `SCN-IDX-004-4`

#### Scenario: SCN-IDS-001-3 Unknown code
- **WHEN** `specctx id new REQ ZZZ` runs and `caps` is `["IDX"]`
- **THEN** it exits 2 and prints `unknown-cap ZZZ`, the configured codes, and `Add "ZZZ" to caps under [ids] in spec-ctx.toml.`

#### Scenario: SCN-IDS-001-4 Empty caps
- **WHEN** `caps` is `[]` and `specctx id new REQ UA` runs in a project with no UA requirement
- **THEN** it prints `REQ-UA-001` and exits 0
