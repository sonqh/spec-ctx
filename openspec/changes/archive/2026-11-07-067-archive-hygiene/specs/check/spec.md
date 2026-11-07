## ADDED Requirements

### Requirement: REQ-CHK-011 Purpose rules
`check --strict` SHALL report `delta-without-purpose <cap>` for a delta of an active change when the capability has no main spec and the delta has no `## Purpose` text. `check` and `check --strict` SHALL warn `placeholder-purpose <cap>` for a main spec Purpose that is empty or starts with `TBD` or `TODO`. The warning keeps exit 0. Archived deltas are exempt.

Refs: REQ-CHK-001, REQ-CHK-006

#### Scenario: SCN-CHK-011-1 New capability without Purpose
- **WHEN** an active change has a delta for `newcap`, no main spec for `newcap` exists, and the delta has no `## Purpose`
- **THEN** `check --strict` exits 1 and prints `delta-without-purpose  newcap`, and plain `check` prints no such finding

#### Scenario: SCN-CHK-011-2 Purpose present or capability known
- **WHEN** the delta has a `## Purpose` with one sentence, or the capability already has a main spec
- **THEN** `check --strict` prints no `delta-without-purpose` finding

#### Scenario: SCN-CHK-011-3 Placeholder in a main spec
- **WHEN** `openspec/specs/newcap/spec.md` has a `## Purpose` whose text is `TBD - created by archiving change demo. Update Purpose after archive.`
- **THEN** `check` and `check --strict` print `warning: placeholder-purpose newcap` and keep exit 0 for a tree that is otherwise clean

#### Scenario: SCN-CHK-011-4 Archived delta
- **WHEN** a delta without `## Purpose` sits under `openspec/changes/archive/`
- **THEN** `check --strict` prints no `delta-without-purpose` finding
