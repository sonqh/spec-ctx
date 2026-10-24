# plant

## ADDED Requirements

### Requirement: REQ-ZZZ-001 Unknown capability
The plant SHALL push to main only through the guard.

Refs: REQ-NOPE-001, not-an-id

#### Scenario: SCN-ZZZ-001-1 Guarded push
- **WHEN** a push to main runs
- **THEN** the guard stops it

#### Scenario: SCN-ZZZ-002-1 Wrong parent
- **WHEN** the scenario ID names another requirement
- **THEN** check reports a mismatch

### Requirement: REQ-APPLY-099 Ünïcode títle ✓ with 𝄞
The tool SHALL keep the bytes of a title. Ünïcode ΣΑΣ text stays as is.

```markdown
### Requirement: REQ-APPLY-098 Inside a fence
```

### Requirement: Missing identifier
The header above has no ID.

### Requirement: REQ-APPLY-100 Lone carriage return
A line with a lone CRhere stays one line.

#### Scenario: SCN-APPLY-100-1 One line
- **WHEN** the file has a lone CR
- **THEN** line numbers match an editor

## REMOVED Requirements

### Requirement: REQ-APPLY-007 Revert
**Reason**: planted removal.
