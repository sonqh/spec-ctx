# intermediate-config

## ADDED Requirements

### Requirement: REQ-IC-010 Frameworks attach to their language
Compile SHALL map each framework to a language through a fixed table. A language rule SHALL list only the frameworks mapped to that language. A framework with no mapping SHALL appear only in the global instructions line `Frameworks:`. The table SHALL cover at least these groups. typescript and javascript: react, next, vue, angular, nestjs, express. python: django, fastapi, flask. java: spring. ruby: rails. go: gin. rust: actix.

Refs: REQ-IC-003, REQ-PROF-004

#### Scenario: SCN-IC-010-1 Python rule has no react
- **WHEN** languages are `typescript, python` and frameworks are `react, nestjs`
- **THEN** `lang-python` has no `Frameworks` line and `lang-typescript` lists `react, nestjs`

#### Scenario: SCN-IC-010-2 Unknown framework
- **WHEN** frameworks include `myframework`
- **THEN** no language rule mentions it and the global instructions list it
