## ADDED Requirements

### Requirement: REQ-IDS-005 Error for a scenario code that holds a number
When the code of `id new` has the form `<CAP>-<digits>`, the usage error SHALL name the right command. For SCN it is `id new SCN <CAP> --for REQ-<CAP>-<NNN>`. For REQ it is `id new REQ <CAP>`. The error exits 2.

Refs: REQ-IDS-001, REQ-IDS-004

#### Scenario: SCN-IDS-005-1 Code with a number
- **WHEN** `id new SCN CLI-009` runs
- **THEN** it exits 2 and the error names `id new SCN CLI --for REQ-CLI-<NNN>`

#### Scenario: SCN-IDS-005-2 REQ with a number
- **WHEN** `id new REQ CLI-009` runs
- **THEN** it exits 2 and the error names `id new REQ CLI`
