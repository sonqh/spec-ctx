## ADDED Requirements

### Requirement: REQ-VER-013 Rerun base checks
`gate --rerun` SHALL print `rerun: base is the zero commit (a new branch), nothing to compare` and exit 0 when `--base` is forty zeros. It SHALL print `rerun: base <ref> is not in this clone. Fetch it or use fetch-depth: 0` and exit 1 when `git rev-parse --verify <base>^{commit}` fails. Both checks run before the merge base and run no Verify command.

Refs: REQ-CLI-009, REQ-VER-010

#### Scenario: SCN-VER-013-1 Zero base
- **WHEN** `gate --rerun --base 0000000000000000000000000000000000000000` runs
- **THEN** it prints the zero commit line, runs no command, and exits 0

#### Scenario: SCN-VER-013-2 Base not in the clone
- **WHEN** `gate --rerun --base` names a commit that the clone lacks
- **THEN** it prints the fetch line with that ref and exits 1
