# Spec Delta

## ADDED Requirements


### Requirement: REQ-CHK-007 Dangling-ref hint names the string literal cause
The hint of `dangling-ref` SHALL name the likely cause, which is a tag inside a string literal or fixture text, and the fix. The fix is to build the text at run time or to move the file under a path in `[scan] ignore`. The scan SHALL keep reading such a tag as a link.

Refs: REQ-CHK-006, REQ-IDX-001

#### Scenario: SCN-CHK-007-1 Hint names cause and fix
- **WHEN** `check` finds `dangling-ref` for a code tag that sits inside a quoted string of a test file
- **THEN** the rule line of `dangling-ref` names `string literal` and `fixture text`, and it names `run time` and `[scan] ignore`

#### Scenario: SCN-CHK-007-2 The scan does not skip strings
- **WHEN** a file under `src/` holds a quoted string with a tag of an ID that no entry has
- **THEN** `check` reports `dangling-ref` for that line
