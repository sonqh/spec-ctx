# Spec Delta

## ADDED Requirements


### Requirement: REQ-SKL-005 Overrides and the stale route
`specctx-run` SHALL say that it overrides two steps of the upstream `openspec-propose` skill. It reads specs with `specctx bundle` or `specctx query` instead of `openspec show`, and it never runs the closing `/opsx:apply`. The `gate` bullet SHALL route a stale-evidence finding to step 1, where `next` returns `repair`. The packaged copy of the skill SHALL equal `skills/specctx-run/SKILL.md`.

Refs: REQ-SKL-001, REQ-SKL-002, REQ-SKL-003, REQ-LOOP-008

#### Scenario: SCN-SKL-005-1 Overrides
- **WHEN** the test reads `skills/specctx-run/SKILL.md`
- **THEN** it names `overrides`, `openspec-propose`, `openspec show`, `specctx bundle`, and `/opsx:apply`

#### Scenario: SCN-SKL-005-2 Stale route
- **WHEN** the test reads the `gate` bullet of `skills/specctx-run/SKILL.md`
- **THEN** it names `stale-evidence`, `step 1`, and `repair`

#### Scenario: SCN-SKL-005-3 Packaged copy
- **WHEN** the test decodes `skills/specctx-run/SKILL.md` from the packaged assets
- **THEN** the bytes equal the file under `skills/`
