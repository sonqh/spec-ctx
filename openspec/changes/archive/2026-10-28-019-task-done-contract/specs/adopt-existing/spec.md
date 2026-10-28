# adopt-existing (delta)

## MODIFIED Requirements

### Requirement: REQ-ADOPT-006 Two documented paths
The README SHALL show a fresh path (`openspec init`, then `specctx init --all`) and an existing path (`specctx init --all`, `adopt --dry-run`, `adopt`, `baseline write`). The existing path section SHALL say that legacy tasks stay in the baseline until an agent adds `[REQ-...]` citations and a Verify code span. `baseline prune` then drops them. Each path SHALL have an end to end test in CI that starts from a fixture and ends with `specctx gate --strict` exit 0.

#### Scenario: SCN-ADOPT-006-1 Existing path end to end
- **WHEN** `tests/paths/existing.sh` runs on the no-ID fixture
- **THEN** it ends with `gate --strict` exit 0

#### Scenario: SCN-ADOPT-006-2 Fresh path end to end
- **WHEN** `tests/paths/fresh.sh` runs on an empty dir
- **THEN** it ends with `gate --strict` exit 0
