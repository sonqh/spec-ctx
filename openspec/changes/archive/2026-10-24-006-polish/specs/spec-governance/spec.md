# spec-governance

## MODIFIED Requirements

### Requirement: REQ-GOV-003 Writing style and gates
Every markdown file SHALL pass `specctx lint tells --baseline 0` and `specctx lint ste --baseline 0 --disable synonym-rotation`. The pre-commit hook and CI SHALL run both through `specctx gate`, `specctx check --strict`, and `openspec validate --all --strict`.

Refs: ADR-005

#### Scenario: SCN-GOV-003-1 CI gate
- **WHEN** a push adds a markdown file with a semicolon
- **THEN** the `specs` CI job fails
