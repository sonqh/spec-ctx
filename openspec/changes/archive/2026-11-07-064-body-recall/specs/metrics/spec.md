## ADDED Requirements

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
