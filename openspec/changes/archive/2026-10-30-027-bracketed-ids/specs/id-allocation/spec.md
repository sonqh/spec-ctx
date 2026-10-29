# id-allocation (delta)

## ADDED Requirements

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
