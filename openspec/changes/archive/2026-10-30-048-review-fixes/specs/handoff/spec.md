## ADDED Requirements

### Requirement: REQ-HND-004 Verdict on plan and archive questions
`handoff resolve <n> --approve|--reject "<answer>"` SHALL store `verdict: approved` or `verdict: rejected`. For a question with `stage: plan` or `stage: archive`, a resolve with neither flag, or with both, SHALL exit 2 and print one line that names `--approve` and `--reject`. The question stays open. Questions of other stages SHALL resolve as before and store no verdict.

Refs: REQ-HND-002, REQ-LOOP-007, REQ-LOOP-009

#### Scenario: SCN-HND-004-1 Approve and reject
- **WHEN** an open question has `stage: plan`, and `handoff resolve 1 --approve "yes"` runs. Then an open question 2 has `stage: archive`, and `handoff resolve 2 --reject "Not yet, one task is weak"` runs
- **THEN** question 1 stores `verdict: approved`, question 2 stores `verdict: rejected`, and both closed with their answers

#### Scenario: SCN-HND-004-2 A plain resolve exits 2
- **WHEN** an open question has `stage: plan` or `stage: archive`, and `handoff resolve <n> "yes"` runs, or runs with both flags
- **THEN** it exits 2, stderr is one line that names `--approve` and `--reject`, and the question stays open

#### Scenario: SCN-HND-004-3 Other stages unchanged
- **WHEN** an open question has `stage: design`, or no stage, and `handoff resolve <n> "redis"` runs
- **THEN** it exits 0, the question closes, and it stores no `verdict`
