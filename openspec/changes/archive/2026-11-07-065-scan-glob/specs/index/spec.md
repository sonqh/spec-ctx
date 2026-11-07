## ADDED Requirements

### Requirement: REQ-IDX-015 Change name under a custom glob
The scan SHALL name a change from the first folder under the fixed prefix of a `[scan] changes` glob. The first glob in list order that matches the path and yields a folder wins. The fixed prefix is the literal path before the first wildcard. After an `archive/` folder, the change is the next folder without its date prefix. Any other path has the change `main`.

Refs: REQ-IDX-005, REQ-IDX-001

#### Scenario: SCN-IDX-015-1 Two folders under a custom prefix
- **WHEN** `[scan] changes` is `["work/changes/**/*.md"]` and `work/changes/a` and `work/changes/b` each have a task 1.1
- **THEN** the index holds `a/1.1` and `b/1.1` and no `main/1.1`

#### Scenario: SCN-IDX-015-2 Archived folder under a custom prefix
- **WHEN** `work/changes/archive/2026-11-01-old/tasks.md` has a task 1.1
- **THEN** its change is `old`, its status is `archived`, and its ID is `old/1.1`

#### Scenario: SCN-IDX-015-3 File with no change folder
- **WHEN** `work/changes/notes.md` holds a task, or a glob has no fixed prefix
- **THEN** the change of that entry is `main`

#### Scenario: SCN-IDX-015-4 Two globs
- **WHEN** `[scan] changes` lists `work/changes/**/*.md` and `team/plans/**/*.md`
- **THEN** a file of each prefix takes its change name from the first folder under its own prefix
