## MODIFIED Requirements

### Requirement: REQ-STAT-005 Gate log and series
`specctx gate` SHALL append one JSON line to `.ctx/gate-log.jsonl` per run: `at`, `ok`, `failed_step` (or null), `duration_s`, `steps`, `strict`. `scripts/ci-local.sh` SHALL not append a second line. `stats` SHALL print `gate_runs`, `gate_pass_rate`, and `gate_failures_caught` from the last 100 lines, and a footer that defines `context_ratio`. `stats --write` SHALL save the table as `docs/metrics/<YYYY-MM-DD>.md` with the UTC date and overwrite a file of the same day.

Refs: REQ-CHK-003

#### Scenario: SCN-STAT-005-1 Log line
- **WHEN** `specctx gate` fails at the `lint tells` step
- **THEN** the last log line has `ok: false` and `failed_step: "lint tells"`

#### Scenario: SCN-STAT-005-2 Pass rate
- **WHEN** the log has 8 passing and 2 failing runs
- **THEN** `stats` prints `gate_pass_rate 0.80 (8/10)` and `gate_failures_caught 2`

#### Scenario: SCN-STAT-005-3 Write
- **WHEN** `stats --write` runs twice on one day
- **THEN** exactly one file for that date exists under `docs/metrics/` and both linters pass on it

#### Scenario: SCN-STAT-005-4 One line per run
- **WHEN** `bash scripts/ci-local.sh` runs once and passes
- **THEN** `.ctx/gate-log.jsonl` grows by exactly one line

#### Scenario: SCN-STAT-005-5 Footer
- **WHEN** `stats` runs
- **THEN** the last line is `context_ratio = bundle chars / chars of all specs. Lower is better.`

#### Scenario: SCN-STAT-005-6 UTC date
- **WHEN** `stats --write` runs at `2026-10-24T23:30:00-05:00`
- **THEN** the file is `docs/metrics/2026-10-25.md`, because the UTC date of that time is 25 October

#### Scenario: SCN-STAT-005-7 Strict flag
- **WHEN** `specctx gate` runs, then `specctx gate --strict` runs
- **THEN** the first log line has `strict: false` and the second has `strict: true`
