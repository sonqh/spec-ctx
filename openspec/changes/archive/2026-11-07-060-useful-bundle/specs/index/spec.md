## MODIFIED Requirements

### Requirement: REQ-IDX-009 Task paths
For a task of any change, active or archived, `specctx build` SHALL record the paths that its line names in backticks. A path is a code span with no space and no `*` that holds a `/` or a `.`. `./` at the start of a path does not count. The index stores them in `paths` of the task entry and omits the key when it is empty.

Refs: REQ-IDX-001

#### Scenario: SCN-IDX-009-1 Paths of an active task
- **WHEN** an active task line names `src/a.ts`, `./b.md`, `bun test`, and `src/**`
- **THEN** the task entry has `paths` equal to `src/a.ts` and `b.md`

#### Scenario: SCN-IDX-009-2 Archived task
- **WHEN** a task line under `openspec/changes/archive/` names `src/a.ts`
- **THEN** the task entry has `paths` equal to `src/a.ts`
