# adopt-existing (delta)

## MODIFIED Requirements

### Requirement: REQ-ADOPT-001 Dry run
`specctx adopt --dry-run` SHALL scan `openspec/specs/**/spec.md` and the deltas of active changes, list every `### Requirement:` and `#### Scenario:` header that carries no ID, and print the ID each would receive as `file:line  old header  ->  new header`. It SHALL print the derived CAP codes and SHALL write nothing. Exit 0 when nothing needs an ID. Exit 1 otherwise, with a last line `exit 1: <n> headers need an ID. Next: specctx adopt`.

Refs: ADR-002

#### Scenario: SCN-ADOPT-001-1 Mapping printed
- **WHEN** `adopt --dry-run` runs on the no-ID fixture
- **THEN** every header without an ID appears once with its new ID and no file changed

#### Scenario: SCN-ADOPT-001-2 Nothing to do
- **WHEN** `adopt --dry-run` runs on this repository
- **THEN** it prints `nothing to adopt` and exits 0

#### Scenario: SCN-ADOPT-001-3 The exit code has a reason
- **WHEN** `adopt --dry-run` runs on the no-ID fixture
- **THEN** it exits 1 and the last line is `exit 1: <n> headers need an ID. Next: specctx adopt`, where `<n>` is the count of `->` lines
