## ADDED Requirements

### Requirement: REQ-QRY-004 Bundle block
`specctx bundle <REQ-ID...> --block` SHALL print the canonical block of each requirement exactly as it sits in its spec file. That is the header, the body, the Refs line, and every scenario. It SHALL print no provenance line, no related entry, and no trailer. It SHALL ignore `--budget` and `--depth`. One blank line separates blocks. An ID that is not a REQ SHALL exit 2.

Refs: REQ-QRY-003

#### Scenario: SCN-QRY-004-1 Verbatim block
- **WHEN** `bundle REQ-APPLY-001 --block` runs
- **THEN** the output equals the requirement in the main spec. It runs from the header to the line before the next requirement header. Trailing blank lines go and one newline stays

#### Scenario: SCN-QRY-004-2 Two IDs and no budget
- **WHEN** `bundle REQ-APPLY-001 REQ-APPLY-007 --block --budget 10` runs
- **THEN** the output holds both blocks, separated by one blank line, and holds no line that starts with `-- `

#### Scenario: SCN-QRY-004-3 Not a requirement
- **WHEN** `bundle SCN-APPLY-001-9 --block` runs
- **THEN** the exit code is 2 and stderr names the ID
