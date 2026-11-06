## ADDED Requirements

### Requirement: REQ-GOV-014 README block for an own repo
The README SHALL hold `## Try it on your own OpenSpec repo` after `## Quickstart`. Its bash block SHALL show `npx -y spec-ctx init --all`, `npx -y spec-ctx adopt`, and `npx -y spec-ctx context <task>` in that order. One sentence after it SHALL say that `init` prints the next command. `docs/reference.md` SHALL show the same three commands first in its existing project path.

Refs: REQ-GOV-006, REQ-ADOPT-006

#### Scenario: SCN-GOV-014-1 The block
- **WHEN** a test reads the README
- **THEN** `## Try it on your own OpenSpec repo` follows `## Quickstart`, and its bash block holds the three commands in order

#### Scenario: SCN-GOV-014-2 The reference
- **WHEN** a test reads `docs/reference.md`
- **THEN** the existing project path starts with `init --all`, `adopt`, and `context <task>`, and the `baseline write` and `gate --strict` lines follow under a later step
