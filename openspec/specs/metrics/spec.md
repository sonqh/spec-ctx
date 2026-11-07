# metrics Specification

## Purpose
What spec-ctx did for a project, in five numbers, from files the repo already has.

## Requirements

### Requirement: REQ-STAT-001 Five metrics
`specctx stats [--change <name>] [--json]` SHALL print `context_ratio`, `evidence_ratio`, `stale_catches`, `cycle_time_median_s`, and `debt` for each change that has evidence and for the project as a whole. Each metric SHALL carry the count of inputs it was computed from. A metric without inputs SHALL print `n/a`, never zero.

#### Scenario: SCN-STAT-001-1 Table
- **WHEN** `stats` runs on this repository
- **THEN** stdout has one row per change with evidence plus a `total` row, and five metric columns

#### Scenario: SCN-STAT-001-2 No inputs
- **WHEN** a change has evidence but no `bundle_chars` in any evidence file
- **THEN** its `context_ratio` prints `n/a`

### Requirement: REQ-STAT-002 Context ratio
`task start` SHALL write `bundle_chars` into `.ctx/current.json`. `task done` SHALL copy it into the evidence file. `context_ratio` SHALL be the mean of `bundle_chars / spec_chars` over tasks that have it, where `spec_chars` is the total canonical req, scn, and decision text in the index at `stats` time.

Refs: REQ-TASK-002, REQ-TASK-004

#### Scenario: SCN-STAT-002-1 Recorded on start
- **WHEN** `task start 005/2.1` prints a bundle of 4,800 characters
- **THEN** `.ctx/current.json` has `bundle_chars: 4800`

#### Scenario: SCN-STAT-002-2 Copied on done
- **WHEN** `task done 005/2.1` passes
- **THEN** the evidence file has `bundle_chars: 4800`

### Requirement: REQ-STAT-003 Evidence and stale catches
`evidence_ratio` SHALL be command evidence divided by all evidence for the change. `stale_catches` SHALL be the count of `.reopened-*.json` files whose `reason` contains `stale`. Both SHALL list the task IDs behind them in `--json`.

Refs: REQ-TASK-005, REQ-CHK-003

#### Scenario: SCN-STAT-003-1 Ratio
- **WHEN** a change has 9 command and 1 manual evidence files
- **THEN** `evidence_ratio` is `0.90 (9/10)`

#### Scenario: SCN-STAT-003-2 Stale count
- **WHEN** a change has two reopen files with reason `stale-evidence ...` and one with reason `spec changed`
- **THEN** `stale_catches` is 2

### Requirement: REQ-STAT-004 Cycle time and debt
`cycle_time_median_s` SHALL be the median of evidence `at` minus the `started_at` that `task start` wrote, over tasks with both. `debt` SHALL be the count of baseline entries plus the current `uncovered`, `scenario-untested`, `done-without-evidence`, `manual-evidence`, `task-without-verify`, and `weak-verify` findings not in the baseline.

Refs: REQ-ADOPT-005

#### Scenario: SCN-STAT-004-1 Median
- **WHEN** three tasks took 120, 300, and 900 seconds
- **THEN** `cycle_time_median_s` is 300

#### Scenario: SCN-STAT-004-2 Debt
- **WHEN** the baseline has 19 entries and strict check finds 2 new `uncovered`
- **THEN** `debt` is 21

#### Scenario: SCN-STAT-004-3 Verify debt
- **WHEN** the baseline is empty and strict check finds one `task-without-verify` and one `weak-verify` on tasks of change `002-ids`
- **THEN** the total `debt` is 2 and the `debt` of the `002-ids` row is 2

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

### Requirement: REQ-STAT-006 Recall benchmark
`scripts/recall.mjs` SHALL read a label file and run `context <task>` once per labelled task. It SHALL report recall within the budget, recall by kind, bundle chars, and p95 time to `recall-<date>.md` and `.json`. Only the `-- ` header lines of the text count. It SHALL exit 2 on a wrong commit, an unknown task, or a bad label file. Each report SHALL print the sha256 of each label file.

Refs: ADR-007, ADR-008, REQ-QRY-015

#### Scenario: SCN-STAT-006-1 Recall of a known project
- **WHEN** the script runs on a temp project with a label file whose tasks have known matches and misses
- **THEN** the recall, the recall of each kind, and the misses of each task in the JSON equal the expected values

#### Scenario: SCN-STAT-006-2 Omitted entries are misses
- **WHEN** a labelled entry is cut by the budget, and only the `truncated:` line names it
- **THEN** the script counts it as a miss, and a labelled entry that printed still matches

#### Scenario: SCN-STAT-006-3 Bad input
- **WHEN** the label file has an unknown task, a missing field, a `commit` that is not HEAD, or tasks that the seed does not pick
- **THEN** the script exits 2, names the cause, and writes no report

#### Scenario: SCN-STAT-006-4 Same input, same result
- **WHEN** the script runs twice on the same commit with the same label file
- **THEN** the recall, the misses, and the label sha256 of the two JSON files are equal

#### Scenario: SCN-STAT-006-5 Seeded sample
- **WHEN** `scripts/recall.mjs --sample 3 --seed 7` runs twice on the same project
- **THEN** it prints the same three task IDs both times, and another seed can print others

### Requirement: REQ-STAT-007 Card only matches
The recall report SHALL count, for each repo and each kind, the matched labels whose header line ends with `| body omitted`. It SHALL name the count `card_only`, print it next to the recall, and still count such a label as matched.

Refs: REQ-STAT-006, REQ-QRY-020

#### Scenario: SCN-STAT-007-1 Card only matches
- **WHEN** a labelled requirement prints as a card that ends with `| body omitted`, and a labelled file prints a plain card
- **THEN** both match, and `card_only` for the requirements is 1 and for the code is 0

#### Scenario: SCN-STAT-007-2 No card only matches
- **WHEN** every labelled entry prints with its body
- **THEN** `card_only` is 0 for each kind

### Requirement: REQ-STAT-008 Body recall
The recall report SHALL give `body_recall` for each repo. It is the share of the labelled requirements with a header that has the reason `ref from <task>`, whose card does not end with `| body omitted`. It SHALL give `body_omitted_mean`, the mean count of `body_omitted` IDs for one `context` run, and `truncated_mean`, the same for `omitted`. It SHALL print them next to `recall` and `card_only`, and `n/a` for `body_recall` when no label counts.

Refs: REQ-STAT-006, REQ-STAT-007

#### Scenario: SCN-STAT-008-1 Share of cited bodies
- **WHEN** a task cites 4 labelled requirements and 3 of their cards do not end with `| body omitted`
- **THEN** `body_recall` is 0.75 and the counts are 3 of 4

#### Scenario: SCN-STAT-008-2 Uncited labels
- **WHEN** a labelled requirement prints only as a delta card, or no labelled requirement has a `ref from` header
- **THEN** that label adds nothing to `body_recall`, and the figure is `n/a` when no label counts

#### Scenario: SCN-STAT-008-3 Omitted IDs per run
- **WHEN** two runs of `context` print 1 and 3 IDs in `body_omitted` and 0 and 2 IDs in `omitted`
- **THEN** `body_omitted_mean` is 2 and `truncated_mean` is 1

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
