# linters Specification

## Purpose
The two markdown linters from the ste-humanize skill, inside the package, so `gate` needs no Python.

## Requirements

### Requirement: REQ-LINT-001 Same rules, same output
`specctx lint tells <file...>` and `specctx lint ste <file...>` SHALL print the same bytes as `scripts/tells-lint.py` and `scripts/ste-lint.py` for the same files and flags. Flags: `--baseline N`, `--disable <rules>`, `--json`, `--selftest`. Exit codes SHALL match.

#### Scenario: SCN-LINT-001-1 Corpus parity
- **WHEN** `tests/lint/parity.sh` runs both implementations on the corpus with the CI flags
- **THEN** every output pair is identical and it prints `lint parity: <n> files identical`

#### Scenario: SCN-LINT-001-2 Selftest
- **WHEN** `specctx lint tells --selftest` and `specctx lint ste --selftest` run
- **THEN** both print the same pass counts as the Python scripts and exit 0

### Requirement: REQ-LINT-002 Rule tables as data
Each linter SHALL hold its rules in one array of `{id, level, pattern, message}`. Every rule SHALL have a unit test with at least one matching and one non-matching line taken from the Python selftest.

#### Scenario: SCN-LINT-002-1 One test per rule
- **WHEN** the rule IDs of `src/lint/*.ts` are compared with the test names
- **THEN** every rule ID appears in a test

### Requirement: REQ-LINT-003 Gate uses the port
`gate` SHALL call the TypeScript linters and SHALL not spawn `python3`. The `linters: skipped` branch SHALL be removed. After parity holds on the corpus, `scripts/*-lint.py` SHALL be removed from the package and the repo. The README SHALL point users of the Python scripts to `specctx lint`.

Refs: REQ-CLI-004

#### Scenario: SCN-LINT-003-1 No python
- **WHEN** `gate --strict` runs with no `python3` on PATH
- **THEN** the linters run and the output has no `skipped` line

#### Scenario: SCN-LINT-003-2 Scripts gone
- **WHEN** the tree is listed after this change
- **THEN** `scripts/tells-lint.py` and `scripts/ste-lint.py` do not exist and `npm pack --dry-run` lists no `.py` file
