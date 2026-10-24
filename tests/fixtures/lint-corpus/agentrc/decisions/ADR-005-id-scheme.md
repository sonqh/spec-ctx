# ADR-005 Stable IDs on every spec artifact

Status: accepted. Date: 2026-10-23.

## Decision

Every requirement, scenario, decision, and task has an ID that never changes once published.

| Kind | Pattern | Example | Lives in |
| --- | --- | --- | --- |
| Requirement | `REQ-<CAP>-<NNN>` | `REQ-PROF-003` | `### Requirement:` header |
| Scenario | `SCN-<CAP>-<NNN>-<n>` | `SCN-PROF-003-2` | `#### Scenario:` header |
| Decision | `ADR-<NNN>` | `ADR-002` | `decisions/ADR-NNN-*.md` title |
| Task | `<change>/<group>.<n>` | `002/3.2` | tasks.md checkbox |
| Code tag | comment `REQ-<CAP>-<NNN>` | `// REQ-CLD-002` | source file |
| Test tag | comment `Covers: REQ-...` | `// Covers: REQ-CLD-002` | test file |

Capability codes:

| Code | Capability path |
| --- | --- |
| PROF | profile-schema |
| IC | intermediate-config |
| ADPT | adapter-contract |
| CLD | adapter-claude-code |
| CDX | adapter-codex |
| APPLY | apply-pipeline |
| CLI | cli |
| ELIC | elicit |
| IMP | import |
| CAT | catalog-resolver |
| CTX | context-engine |
| BOOT | session-bootstrap |
| GOV | spec-governance |

Links between IDs are written as a line `Refs: ID, ID` at the end of a requirement, decision, or paragraph. The context engine reads these lines and nothing else to build its graph.

## Why

- OpenSpec identifies requirements by header text. Header text changes when wording improves. An ID does not.
- The context engine needs a key that survives rewording to find code, tests, and tasks for a requirement.

## Consequences

- Renaming a requirement keeps its ID. Removing one retires the ID. IDs are never reused.
- `ctx check` fails when an ID is duplicated or a Refs target does not exist.

Refs: REQ-GOV-001, REQ-CTX-001
