# id-allocation Specification

## Purpose
The tool decides the next ID, not the agent. It reads the index and the retired list, so it never gives out a number twice.

## Requirements

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

### Requirement: REQ-IDS-002 Batch allocation
`specctx id new REQ <CAP> --count N` SHALL print N consecutive IDs, one per line, so a proposal can reserve a block before the spec is written. `--json` SHALL print them as an array.

#### Scenario: SCN-IDS-002-1 Reserve three
- **WHEN** `specctx id new REQ TASK --count 3` runs with no TASK requirements yet
- **THEN** it prints `REQ-TASK-001`, `REQ-TASK-002`, `REQ-TASK-003`

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

### Requirement: REQ-IDS-004 Bracketed output of id new
`id new REQ <CAP>` and `id new SCN <CAP> --for <REQ>` SHALL print each ID in square brackets, `[REQ-UA-001]`, when `[ids] brackets` is true, and bare otherwise. `--json` SHALL print the same strings. `--for` SHALL accept a REQ ID in either form. `id new ADR` and `id new DEC` keep the bare form.

Refs: REQ-IDS-001, REQ-ADOPT-010

#### Scenario: SCN-IDS-004-1 Default bare output
- **WHEN** `id new REQ UA` runs without the `brackets` key
- **THEN** it prints `REQ-UA-002`

#### Scenario: SCN-IDS-004-2 Bracketed output
- **WHEN** `id new REQ UA` and `id new SCN UA --for REQ-UA-001` run with `brackets = true`
- **THEN** they print `[REQ-UA-002]` and `[SCN-UA-001-2]`

#### Scenario: SCN-IDS-004-3 Count with brackets
- **WHEN** `id new REQ UA --count 3` runs with `brackets = true`
- **THEN** it prints `[REQ-UA-002]`, `[REQ-UA-003]`, and `[REQ-UA-004]`, one per line

#### Scenario: SCN-IDS-004-4 Bracketed for
- **WHEN** `id new SCN UA --for [REQ-UA-001]` runs
- **THEN** it prints the next scenario ID of `REQ-UA-001`

### Requirement: REQ-IDS-005 Error for a scenario code that holds a number
When the code of `id new` has the form `<CAP>-<digits>`, the usage error SHALL name the right command. For SCN it is `id new SCN <CAP> --for REQ-<CAP>-<NNN>`. For REQ it is `id new REQ <CAP>`. The error exits 2.

Refs: REQ-IDS-001, REQ-IDS-004

#### Scenario: SCN-IDS-005-1 Code with a number
- **WHEN** `id new SCN CLI-009` runs
- **THEN** it exits 2 and the error names `id new SCN CLI --for REQ-CLI-<NNN>`

#### Scenario: SCN-IDS-005-2 REQ with a number
- **WHEN** `id new REQ CLI-009` runs
- **THEN** it exits 2 and the error names `id new REQ CLI`
