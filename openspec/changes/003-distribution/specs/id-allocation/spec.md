# id-allocation

## MODIFIED Requirements

### Requirement: REQ-IDS-003 Retire
`specctx id retire <ID> "<reason>"` SHALL append a row `| <ID> | <date> | <reason> |` to `decisions/retired-ids.md`, creating the table if the file is empty. It SHALL exit 2 if the ID still has a non-archived entry, with the file and line of that entry. An ID whose only copies are archived is retirable.

Refs: REQ-GOV-002

#### Scenario: SCN-IDS-003-1 Retire a removed ID
- **WHEN** `REQ-QRY-009` exists in no spec and `specctx id retire REQ-QRY-009 "merged into QRY-003"` runs
- **THEN** `retired-ids.md` has a row for it and `check` reports `reused-id` if it reappears

#### Scenario: SCN-IDS-003-2 Still in use
- **WHEN** the ID is canonical in `openspec/specs/`
- **THEN** the command exits 2 and names the file and line

#### Scenario: SCN-IDS-003-3 Archived copy only
- **WHEN** the ID exists only under `openspec/changes/archive/`
- **THEN** `id retire` appends the row and exits 0
