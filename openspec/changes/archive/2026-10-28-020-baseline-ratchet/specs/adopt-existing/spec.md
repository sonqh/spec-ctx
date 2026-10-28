# adopt-existing (delta)

## ADDED Requirements

### Requirement: REQ-ADOPT-008 Baseline against the merge base
`gate` SHALL run a `baseline` step after `check`. It reads `.ctx/baseline.json` at the merge base of HEAD and `[gate] base` (default `origin/main`). A line that the merge base lacks, or a `lint` line with a higher count, is new debt. New debt fails the step with `baseline: fail, <n> new entr(y|ies)` and one line per entry, at most 50. A `baseline:` HEAD subject passes. Without git, a merge base, or the file there, the step prints `baseline: skipped (<reason>)`.

Refs: REQ-GOV-007

#### Scenario: SCN-ADOPT-008-1 A new entry fails the gate
- **WHEN** the merge base holds `["uncovered REQ-UA-001"]` and the working file holds that line and `uncovered REQ-UA-002`
- **THEN** `gate` prints `baseline: fail, 1 new entry`, then `uncovered REQ-UA-002`, runs no linter, and exits 1

#### Scenario: SCN-ADOPT-008-2 A baseline commit passes
- **WHEN** the same two files exist and the subject of HEAD is `baseline: adopt day one`, or `SPECCTX_BASELINE_SUBJECT` holds that text
- **THEN** `gate` prints `baseline: ok (baseline: commit)` and goes on to the linters

#### Scenario: SCN-ADOPT-008-3 No base skips the step
- **WHEN** the project has no `.git`, or `[gate] base` names a ref with no merge base, or the merge base has no `.ctx/baseline.json`
- **THEN** `gate` prints one `baseline: skipped (<reason>)` line with `no git repository`, `no merge base with <base>`, or `no .ctx/baseline.json at <sha>`, and goes on to the linters
