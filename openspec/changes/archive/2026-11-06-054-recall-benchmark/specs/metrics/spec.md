## ADDED Requirements

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
