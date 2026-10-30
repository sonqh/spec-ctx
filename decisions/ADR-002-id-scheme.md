# ADR-002 Stable IDs on every spec artifact

Status: accepted. Date: 2026-10-24. Generalized from agentrc ADR-005.

## Decision

Every requirement, scenario, decision, design decision, and task has an ID that never changes once published.

| Kind | Pattern | Example | Lives in |
| --- | --- | --- | --- |
| Requirement | `REQ-<CAP>-<NNN>` | `REQ-IDX-003` | `### Requirement:` header |
| Scenario | `SCN-<CAP>-<NNN>-<n>` | `SCN-IDX-003-2` | `#### Scenario:` header |
| Decision record | `ADR-<NNN>` | `ADR-002` | `decisions/ADR-NNN-*.md` title |
| Design decision | `<key>/D<n>` | `002/D3` | bullet under `## Decisions` in design.md |
| Task | `<key>/<group>.<n>` | `002/3.2` | tasks.md checkbox |
| Code tag | comment `REQ-<CAP>-<NNN>` | `// REQ-IDX-003` | source file |
| Test tag | comment `Covers: REQ-...` | `// Covers: REQ-IDX-003` | test file |

`<key>` is the change key from 008/D1. A folder that starts with digits and a dash, like `002-ids`, has the digits as its key. Any other folder, like `add-mfa`, has its full name as its key.

`<CAP>` is a capability code from the project config. `<NNN>` is allocated by `specctx id new` and never reused. Links are written as a line `Refs: ID, ID`. The engine reads these lines and nothing else to build its graph.

Capability codes for spec-ctx:

| Code | Capability path |
| --- | --- |
| IDX | index |
| QRY | query |
| CHK | check |
| IDS | id-allocation |
| TASK | task-workflow |
| VER | verify-runner |
| HND | handoff |
| CLI | cli |
| SCH | schema-bundle |
| SKL | skills |
| DIST | distribution |
| ADOPT | adopt-existing |
| STAT | metrics |
| LINT | linters |
| LOOP | loop |
| GOV | spec-governance |

## Why

- OpenSpec identifies requirements by header text. Header text changes when wording improves. An ID does not.
- An ID that never moves lets archive compare the same requirement across changes. OpenSpec's own parallel merge plan names the missing base fingerprint as the root cause of lost scenarios.
- The engine needs a key that survives rewording to find code, tests, tasks, and evidence for a requirement.

## Consequences

- A requirement or scenario header carries its ID bare or in square brackets, `[REQ-IDX-003]`. Upstream PR Fission-AI/OpenSpec#1979 (open on 2026-10-30) proposes ID matching with a different grammar, `[AUTH-3]` and `[AUTH-3.1]`. spec-ctx does not read that grammar yet. `[ids] brackets` in `spec-ctx.toml` picks the form that spec-ctx writes.
- Renaming a requirement keeps its ID. Removing one retires the ID in `decisions/retired-ids.md`.
- `specctx check` fails on a duplicated canonical ID, a reused retired ID, or a `Refs:` target that does not exist.

Refs: REQ-IDS-001, REQ-IDX-001
