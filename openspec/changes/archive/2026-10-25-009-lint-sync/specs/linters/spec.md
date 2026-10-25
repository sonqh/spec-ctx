# linters (delta)

## MODIFIED Requirements

### Requirement: REQ-LINT-001 Same rules, same output
`specctx lint tells <file...>` and `specctx lint ste <file...>` SHALL print the same bytes as `tells-lint.py` and `ste-lint.py` of ste-humanize-skill at the commit `ORACLE_SHA` in `tests/lint/parity.sh`, for the same files and flags. Flags: `--baseline N`, `--disable <rules>`, `--json`, `--selftest`. Exit codes SHALL match. A record against an oracle checkout at another commit SHALL exit 2 and print both SHAs.

#### Scenario: SCN-LINT-001-1 Corpus parity
- **WHEN** `tests/lint/parity.sh` runs both implementations on the corpus with the CI flags
- **THEN** every output pair is identical and it prints `lint parity: <n> files identical`

#### Scenario: SCN-LINT-001-2 Selftest
- **WHEN** `specctx lint tells --selftest` and `specctx lint ste --selftest` run
- **THEN** both print the same pass counts as the Python scripts and exit 0

#### Scenario: SCN-LINT-001-3 Wrong oracle
- **WHEN** `parity.sh --record` runs with `SPECCTX_LINT_ORACLE` at a checkout whose HEAD is not `ORACLE_SHA`
- **THEN** it exits 2 and prints both SHAs

#### Scenario: SCN-LINT-001-4 Ported fixes
- **WHEN** `specctx lint tells` runs on a line `It's not just a linter — it's a gate. The team leverages it.`
- **THEN** it reports `not-x-its-y` once and `stock-word` once with the match `leverages`
