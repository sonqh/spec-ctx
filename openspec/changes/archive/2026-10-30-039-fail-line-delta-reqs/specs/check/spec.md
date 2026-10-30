## ADDED Requirements

### Requirement: REQ-CHK-009 Delta requirements need a test before archive
`check --strict` SHALL report `uncovered` for a requirement in an ADDED or MODIFIED block of an active change. This holds only when the change has a task, no task is open, and no `Covers:` tag names it. A requirement that a pending REMOVED block names SHALL get no finding.

Refs: REQ-CHK-002, REQ-CHK-008

#### Scenario: SCN-CHK-009-1 Open task
- **WHEN** an active change holds a delta requirement with no `Covers:` tag and one task is open
- **THEN** `check --strict` reports no `uncovered` for it

#### Scenario: SCN-CHK-009-2 All tasks done
- **WHEN** no task of the change is open, the change has a task, and no `Covers:` tag names a delta requirement
- **THEN** `check --strict` reports `uncovered` for it

#### Scenario: SCN-CHK-009-3 Covered requirement
- **WHEN** no task of the change is open, the change has a task, and a `Covers:` tag names the delta requirement
- **THEN** `check --strict` reports no `uncovered` for it

#### Scenario: SCN-CHK-009-4 Modified requirement
- **WHEN** no task of the change is open and no `Covers:` tag names a requirement in a MODIFIED block
- **THEN** `check --strict` reports `uncovered` for it

#### Scenario: SCN-CHK-009-5 Pending REMOVED
- **WHEN** no task of the change is open and a REMOVED block of an active change names a requirement with no tag
- **THEN** `check --strict` reports no `uncovered` for it
