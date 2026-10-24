# cli

## ADDED Requirements

### Requirement: REQ-CLI-004 gate command
`specctx gate [--strict] [--markdown <globs>]` SHALL run these gates in order: `check` (after `build`), `specctx lint tells` and `specctx lint ste` on the markdown globs, then `openspec validate --all`. Default globs: `openspec/**/*.md decisions/*.md docs/**/*.md *.md`. It SHALL print one `ok` or `fail` line per gate, stop at the first failure, and exit 1. `gate` SHALL need no `python3`.

Refs: REQ-CHK-001, REQ-GOV-003

#### Scenario: SCN-CLI-004-1 Clean tree
- **WHEN** `specctx gate --strict` runs on this repository
- **THEN** it prints three `ok` lines and exits 0

#### Scenario: SCN-CLI-004-2 Stops at first failure
- **WHEN** a spec has a dangling ref
- **THEN** `gate` prints `check: fail`, prints the findings, runs no linter, and exits 1

#### Scenario: SCN-CLI-004-3 No python
- **WHEN** `python3` is not on PATH
- **THEN** `gate --strict` runs both linters and the output has no `skipped` line
