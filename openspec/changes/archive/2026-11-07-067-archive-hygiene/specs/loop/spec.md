## ADDED Requirements

### Requirement: REQ-LOOP-019 Purpose before archive
`next` SHALL not return `archive` for a change while the rule of `src/check/purpose.ts` reports `delta-without-purpose` for a delta of that change. It SHALL return `gate` with the command `specctx check --strict`. The `reason` SHALL name the delta file and tell the agent to add `## Purpose` before `## ADDED Requirements`.

Refs: REQ-LOOP-001, REQ-LOOP-007, REQ-CHK-011

#### Scenario: SCN-LOOP-019-1 Archive refused
- **WHEN** every task of `067-x` has `[x]` and evidence, the gate passed, and the delta of a new capability has no `## Purpose`
- **THEN** `next --json` prints `action: gate`, the command `specctx check --strict`, and a `reason` that names the delta file and `## Purpose`

#### Scenario: SCN-LOOP-019-2 Archive allowed
- **WHEN** the delta gains a `## Purpose` with one sentence
- **THEN** `next --json` prints `action: archive` again
