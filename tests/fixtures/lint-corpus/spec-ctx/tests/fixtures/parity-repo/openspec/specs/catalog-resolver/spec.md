# catalog-resolver Specification

## Purpose
Defines how agentrc fetches skills, commands, and MCP definitions from external catalogs, verifies them, and pins them. A profile then rebuilds the same way on any machine.

## Requirements

### Requirement: REQ-CAT-001 Reference form
A catalog reference SHALL be `<source>/<name>` or `<source>/<name>@<ref>` where `source` is `cct` (claude-code-templates) or `skills` (skills.sh), `name` is the item path in that source, and `ref` is a git ref or version. A missing ref SHALL resolve to the source's latest at resolve time and be pinned.

Refs: REQ-PROF-008, ADR-004

#### Scenario: SCN-CAT-001-1 Unknown source
- **WHEN** a profile lists `foo/bar`
- **THEN** validation fails and names the two supported sources

### Requirement: REQ-CAT-002 Sources
The resolver SHALL fetch `cct` items from the davila7/claude-code-templates repository at the item's path and `skills` items through the `npx skills` CLI into a temp directory. Each source SHALL be an adapter behind one interface `{fetch(ref) -> {files, resolvedRef}}`.

#### Scenario: SCN-CAT-002-1 Item not found
- **WHEN** `cct/development-tools/not-a-thing` does not exist upstream
- **THEN** resolve exits 2 and names the item and the source URL it tried

### Requirement: REQ-CAT-003 Digest
The digest of an item SHALL be the SHA-256 of a canonical tar of its files (sorted paths, fixed mtime, mode 0644). The cache directory SHALL be `~/.agentrc/cache/<source>/<name>/<digest>/` with a `.digest` file.

Refs: REQ-IC-007

#### Scenario: SCN-CAT-003-1 Same content same digest
- **WHEN** the same files are fetched twice with different mtimes
- **THEN** the digests are equal

### Requirement: REQ-CAT-004 Pin in lockfile
After resolve, each item's `resolvedRef` and digest SHALL be written to the lockfile. `compile` SHALL use the lockfile digest, not the profile ref, to pick the cache directory.

Refs: REQ-APPLY-005

#### Scenario: SCN-CAT-004-1 Rebuild on new machine
- **WHEN** the profile and lockfile are copied to a new machine and `resolve` runs
- **THEN** the cache is populated with the same digests and `plan` reports no differences from the first machine

### Requirement: REQ-CAT-005 Digest mismatch
When a fetch for a pinned ref produces a different digest than the lockfile, resolve SHALL stop with exit 1, print both digests, and suggest `update`.

Refs: ADR-004

#### Scenario: SCN-CAT-005-1 Upstream rewrote a tag
- **WHEN** the lockfile pins `cct/x@v1` at digest A and upstream now serves digest B for `v1`
- **THEN** resolve exits 1 and prints A and B

### Requirement: REQ-CAT-006 Offline apply
`compile` and `apply` SHALL work with no network when every lockfile digest is present in the cache. A missing digest SHALL produce exit 2 naming the item and the command `resolve`.

#### Scenario: SCN-CAT-006-1 Network down
- **WHEN** the cache is complete and the network is unreachable
- **THEN** `apply` succeeds

### Requirement: REQ-CAT-007 update
`update [item]` SHALL re-resolve unpinned refs (or the named item), print old and new refs and digests, and rewrite the lockfile. It SHALL not apply.

#### Scenario: SCN-CAT-007-1 One item updated
- **WHEN** `update skills/superpowers/brainstorm` runs and upstream moved
- **THEN** the lockfile changes for that item only

### Requirement: REQ-CAT-008 Content safety
Fetched items SHALL be rejected when they contain files outside their directory, symlinks, executables other than `*.sh` and `*.py`, or a file larger than 1 MB. The reason SHALL be printed.

#### Scenario: SCN-CAT-008-1 Symlink in item
- **WHEN** a fetched skill contains a symlink
- **THEN** resolve rejects it and names the path

### Requirement: REQ-CAT-009 Fetch error format
A failed fetch SHALL print four labeled lines: `item:` the reference, `source:` the URL or command tried, `cause:` one sentence, `fix:` one command or action. Child process output SHALL not appear without `--verbose`. Exit codes do not change: 2 for a missing item (REQ-CAT-002), 1 for a digest mismatch (REQ-CAT-005).

Refs: REQ-CLI-004

#### Scenario: SCN-CAT-009-1 Unknown skill
- **WHEN** `resolve` cannot find `skills/sonqh/missing`
- **THEN** the output has the four labels and the `fix:` line names a way to check the reference

#### Scenario: SCN-CAT-009-2 Exit code
- **WHEN** an item is missing upstream
- **THEN** `resolve` exits 2 and prints the four labeled lines
