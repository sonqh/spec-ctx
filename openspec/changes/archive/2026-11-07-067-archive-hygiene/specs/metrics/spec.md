## ADDED Requirements

### Requirement: REQ-STAT-009 Write keeps old rows
`stats --write` on a day that has a file SHALL keep each change row of that file and add rows only for changes it lacks. It SHALL read the spec text size from that file and use it for the new rows and the total row. It SHALL replace the three gate rows together when the log holds at least as many runs as the file, else keep all three. A new day writes a new file.

Refs: REQ-STAT-005

#### Scenario: SCN-STAT-009-1 Old rows stay
- **WHEN** `stats --write` ran, a stored change row got a hand edit, a change gained evidence, and `stats --write` ran again on the same day
- **THEN** the edited row stays, the new change has a row, and the total row counts both

#### Scenario: SCN-STAT-009-2 Short gate log
- **WHEN** the file reports `gate_runs` 49 and the gate log now holds 28 lines
- **THEN** the file still reports 49 runs, 0.69 pass rate, and 15 failures

#### Scenario: SCN-STAT-009-3 New day
- **WHEN** `stats --write` runs on a day with no file
- **THEN** it writes a new file with every row computed from the evidence

#### Scenario: SCN-STAT-009-4 Same bytes
- **WHEN** `stats --write` runs twice on one day with no change between the runs
- **THEN** the two files are byte for byte equal, and the spec text sentence matches the size the rows used

### Requirement: REQ-STAT-010 Write sets the README total row
`stats --write` SHALL set the newest file path and the `| total |` row under `## Measured` in `README.md` to those of the file it wrote. It SHALL edit only when `## Measured`, a line that starts `The newest file is`, and a `| total |` row all exist. It SHALL not create a README.

Refs: REQ-STAT-005, REQ-GOV-006

#### Scenario: SCN-STAT-010-1 Total row set
- **WHEN** `README.md` has `## Measured`, a line `The newest file is` with a path, and a `| total |` row, and `stats --write` runs
- **THEN** the path and the total row match the new file and the other lines stay

#### Scenario: SCN-STAT-010-2 No section
- **WHEN** `README.md` has no `## Measured`, or no `README.md` exists, and `stats --write` runs
- **THEN** the README stays as it was or stays absent

#### Scenario: SCN-STAT-010-3 Anchors and rerun
- **WHEN** `README.md` has `## Measured` and a `| total |` row but no `The newest file is` line, or a second `stats --write` runs on the same day
- **THEN** the first README stays as it was and the second run changes no byte

## MODIFIED Requirements

### Requirement: REQ-STAT-005 Gate log and series
`specctx gate` SHALL append one JSON line to `.ctx/gate-log.jsonl` per run: `at`, `ok`, `failed_step` (or null), `duration_s`, `steps`, `strict`. `scripts/ci-local.sh` SHALL not append a second line. `stats` SHALL print `gate_runs`, `gate_pass_rate`, and `gate_failures_caught` from the last 100 lines, and a footer that defines `context_ratio`. `stats --write` SHALL save the table as `docs/metrics/<YYYY-MM-DD>.md` with the UTC date. A file of the same day follows REQ-STAT-009.

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
