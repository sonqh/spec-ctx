## ADDED Requirements

### Requirement: REQ-ADOPT-012 Family codes
Three or more capability folders with the same first kebab segment form a family. Each member with two or more segments SHALL take a family code before the candidates of REQ-ADOPT-004. The family code is three letters of the first segment, then three letters of the rest, upper case. A collision SHALL fall through to REQ-ADOPT-004. A code from `[ids] paths` or an ID in the spec SHALL still win. The report SHALL name each family and its prefix.

Refs: REQ-ADOPT-004, ADR-002

#### Scenario: SCN-ADOPT-012-1 A family of three
- **WHEN** the specs hold `cli-config`, `cli-completion`, `cli-version`, and `user-auth`
- **THEN** the codes are `CLICON`, `CLICOM`, `CLIVER`, and `UA`

#### Scenario: SCN-ADOPT-012-2 Two members are no family
- **WHEN** the specs hold `user-auth` and `user-profile` only
- **THEN** the codes are `UA` and `UP`

#### Scenario: SCN-ADOPT-012-3 A collision in a family
- **WHEN** a family holds `cli-config`, `cli-configure`, and `cli-version`
- **THEN** `cli-config` takes `CLICON` and `cli-configure` falls through to the candidates of REQ-ADOPT-004
