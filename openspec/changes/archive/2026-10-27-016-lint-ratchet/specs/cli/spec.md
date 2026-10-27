# cli (delta)

## MODIFIED Requirements

### Requirement: REQ-CLI-004 gate command
`specctx gate [--strict] [--markdown <globs>]` SHALL run in order: `check` (after `build`), `lint tells` and `lint ste` on the globs of `[gate] markdown` (`--markdown` overrides), then `openspec validate --all`. The lint gate fails only when a hard finding count per file and rule rises above its line in `.ctx/baseline.json`. It SHALL print one `ok` or `fail` line per gate, stop at the first failure, and exit 1. `gate` SHALL need no `python3`.

Refs: REQ-CHK-001, REQ-GOV-003, REQ-ADOPT-007

#### Scenario: SCN-CLI-004-1 Clean tree
- **WHEN** `specctx gate --strict` runs on this repository
- **THEN** it prints three `ok` lines and exits 0

#### Scenario: SCN-CLI-004-2 Stops at first failure
- **WHEN** a spec has a dangling ref
- **THEN** `gate` prints `check: fail`, prints the findings, runs no linter, and exits 1

#### Scenario: SCN-CLI-004-3 No python
- **WHEN** `python3` is not on PATH
- **THEN** `gate --strict` runs both linters and the output has no `skipped` line

#### Scenario: SCN-CLI-004-4 Lint summary and cap
- **WHEN** 60 files each gain one new dash and `gate` runs
- **THEN** the lint step prints `linters: fail, 60 new finding(s) in 60 file(s)`, then 50 detail lines of `<file>  <rule>  <current> (baseline <n>)`, then `... 10 more line(s)`, and `--json` lists all 60

#### Scenario: SCN-CLI-004-5 Globs from config
- **WHEN** `spec-ctx.toml` sets `[gate] markdown = ["docs/*.md"]` and `decisions/bad.md` has a semicolon
- **THEN** `gate` prints `linters: ok` for that file set, and `gate --markdown "decisions/*.md"` prints `linters: fail`
