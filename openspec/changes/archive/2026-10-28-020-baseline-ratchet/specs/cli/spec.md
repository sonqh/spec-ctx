# cli (delta)

## MODIFIED Requirements

### Requirement: REQ-CLI-004 gate command
`specctx gate [--strict] [--markdown <globs>]` SHALL run in order: `check` after `build`, `baseline` against the merge base, `lint tells` and `lint ste` on `[gate] markdown` (`--markdown` overrides), `openspec validate --all` with the command in `[gate] openspec`, and the length check. The lint step fails only when a count rises above its baseline line. One `ok`, `skipped`, or `fail` line per step. Stop at the first failure, exit 1. No `python3`.

Refs: REQ-CHK-001, REQ-ADOPT-008

#### Scenario: SCN-CLI-004-1 Clean tree
- **WHEN** `specctx gate --strict` runs on this repository
- **THEN** it prints one `ok` line per step and exits 0

#### Scenario: SCN-CLI-004-2 Stops at first failure
- **WHEN** a spec has a dangling ref
- **THEN** `gate` prints `check: fail`, prints the findings, runs no linter, and exits 1

#### Scenario: SCN-CLI-004-3 No python
- **WHEN** `python3` is not on PATH
- **THEN** `gate --strict` runs both linters and the output has no `skipped` line for them

#### Scenario: SCN-CLI-004-4 Lint summary and cap
- **WHEN** 60 files each gain one new dash and `gate` runs
- **THEN** the lint step prints `linters: fail, 60 new finding(s) in 60 file(s)`, then 50 detail lines of `<file>  <rule>  <current> (baseline <n>)`, then `... 10 more line(s)`, and `--json` lists all 60

#### Scenario: SCN-CLI-004-5 Globs from config
- **WHEN** `spec-ctx.toml` sets `[gate] markdown = ["docs/*.md"]` and `decisions/bad.md` has a semicolon
- **THEN** `gate` prints `linters: ok` for that file set, and `gate --markdown "decisions/*.md"` prints `linters: fail`

#### Scenario: SCN-CLI-004-6 OpenSpec command from config
- **WHEN** `spec-ctx.toml` sets `[gate] openspec = "/bin/false"` and `SPECCTX_OPENSPEC` is not set
- **THEN** `gate` prints `validate: fail` and exits 1, and the same run with `SPECCTX_OPENSPEC=/bin/true` prints `validate: ok` and exits 0

#### Scenario: SCN-CLI-004-7 Step order with the baseline
- **WHEN** `gate` runs on a project with no `.git` and passes
- **THEN** stdout reads `check: ok`, `baseline: skipped (no git repository)`, `linters: ok (...)`, `validate: ok`, `spec-length: ok` in that order, and the gate log line has `steps` equal to `check`, `baseline`, `lint tells`, `lint ste`, `validate`, `spec-length`
