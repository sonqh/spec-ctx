## ADDED Requirements

### Requirement: REQ-IDX-010 Change and capability entries
`build` SHALL write a `change` entry for each change folder, with the ID `change/<key>`. It SHALL write a `cap` entry for each capability that has a `specs/<cap>/spec.md` file, with the ID `cap/<name>`. Both kinds join the kind list of REQ-IDX-002. Both are canonical, and `check` ignores them. The index SHALL hold no `delta:`, `cap:`, or `main:` link. Those edges come from the `change`, `file`, and `status` fields at query time.

Refs: REQ-IDX-002, ADR-006

#### Scenario: SCN-IDX-010-1 Change entry
- **WHEN** change `009-add-x` holds a delta spec for capability `thing` with REQ-TH-001
- **THEN** the index holds `change/009` with a file in that folder, and no entry holds a `delta:`, `cap:`, or `main:` link

#### Scenario: SCN-IDX-010-2 Capability entry
- **WHEN** `openspec/specs/thing/spec.md` exists and an active change also holds a delta spec for `thing`
- **THEN** the index holds one `cap/thing` entry with the main spec file, and a second build writes the same entries

### Requirement: REQ-IDX-012 Design links
A task SHALL carry a `design:<key>/D<n>` link in its `links` list for each design decision that its line names. The name is a full ID like `045/D2`, or a bare `D3` that names a decision of its own change. A name with no matching decision SHALL make no link. This is the only link the index stores.

Refs: REQ-IDX-009, REQ-IDX-010

#### Scenario: SCN-IDX-012-1 Full and bare names
- **WHEN** a task of change `009-add-x` says `per 008/D2` and `D3`, and both decisions exist
- **THEN** the task entry has the links `design:008/D2` and `design:009/D3`

#### Scenario: SCN-IDX-012-2 No such decision
- **WHEN** a task line names `D9` and its change has no ninth decision
- **THEN** the task entry has no `design:` link

### Requirement: REQ-IDX-013 One change entry per key
Two change folders with the same key SHALL give one `change/<key>` entry. An active folder wins over an archived one. Among active folders the smaller folder name wins. Among archived folders the newest date prefix wins, then the smaller folder name.

Refs: REQ-IDX-010, REQ-IDX-005

#### Scenario: SCN-IDX-013-1 Active wins
- **WHEN** the folders `openspec/changes/009-add-x` and `openspec/changes/archive/2026-01-02-009-old` both exist
- **THEN** the index holds one `change/009` entry with a file in `009-add-x`

#### Scenario: SCN-IDX-013-2 Newest archive wins
- **WHEN** only the archived folders `2026-01-02-009-old` and `2026-03-04-009-new` exist
- **THEN** the index holds one `change/009` entry with a file in the folder dated 2026-03-04
