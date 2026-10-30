## ADDED Requirements

### Requirement: REQ-IDX-008 Code tag reads every REQ ID
`specctx build` SHALL record a code entry for every REQ ID on a code tag line. A tag line has a comment marker (`//`, `#`, `/*`, or `*`) and then a REQ ID. Every REQ ID after the marker counts, with a word boundary on both sides. `REQ-AB-0011` SHALL not match `REQ-AB-001`. A `Covers:` line is not a code tag.

Refs: REQ-IDX-001, REQ-IDX-007

#### Scenario: SCN-IDX-008-1 Two IDs on one line
- **WHEN** a code line is `// REQ-AB-001, REQ-AB-002 note`
- **THEN** the index records a code entry for REQ-AB-001 and one for REQ-AB-002

#### Scenario: SCN-IDX-008-2 Boundary and Covers
- **WHEN** a code line is `// REQ-AB-001 REQ-AB-0021` or a test line is `// Covers: REQ-AB-001`
- **THEN** the first line records REQ-AB-001 only, and the Covers line records no code entry

### Requirement: REQ-IDX-009 Task paths
For a task in an active change, `specctx build` SHALL record the paths that its line names in backticks. A path is a code span with no space and no `*` that holds a `/` or a `.`. `./` at the start of a path does not count. The index stores them in `paths` of the task entry and omits the key when it is empty. A task under `archive/` records none.

Refs: REQ-IDX-001

#### Scenario: SCN-IDX-009-1 Paths of an active task
- **WHEN** an active task line names `src/a.ts`, `./b.md`, `bun test`, and `src/**`
- **THEN** the task entry has `paths` equal to `src/a.ts` and `b.md`

#### Scenario: SCN-IDX-009-2 Archived task
- **WHEN** a task line under `openspec/changes/archive/` names `src/a.ts`
- **THEN** the task entry has no `paths` key
