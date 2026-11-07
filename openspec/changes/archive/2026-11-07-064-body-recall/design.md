# Design

## Context

- The fill in `src/graph/bundle.ts` runs in five steps. They are cards of class 0, cards of class 1, bodies of class 0, cards of class 2, and bodies of class 2. Class 0 holds the requested blocks and the cited requirements. Class 1 holds code, test, and named path cards. Class 2 holds the structural deltas and the decisions.
- The task body prints in full and counts against the budget.
- `scripts/recall.mjs` reads the header lines of `context <task> --json`. A cited requirement has the reason `ref from <task>`. A marked card ends with `| body omitted`.
- Baseline of 2026-11-07 on this repo, budget 8000, 20 tasks: tasks cite 54 labelled requirements. 43 print a full body and 11 lose it. The fixture repo has no cited requirement, so its `body_recall` is `n/a`.

## Goals / Non-Goals

**Goals:**
- Report `body_recall`, and a proxy for the `bundle <ID>` calls, per repo.
- Raise `body_recall` to 0.8 or more on this repo while recall stays at or above 0.95.

**Non-Goals:**
- A new default budget, a change to the labels, or a change to the card columns.

## Decisions

- D1 Measure. A labelled requirement counts when a header of the task has the reason `ref from <task>` and the label as its ID. It counts as printed when one such header does not end with `| body omitted`. `body_recall` is the printed count over the counted count. It counts full bodies only. The fixture gives `n/a`. Refs: REQ-STAT-008
- D2 Proxy. `body_omitted_mean` is the mean length of `body_omitted` in the JSON of one `context` run over the tasks of the benchmark. `truncated_mean` is the same for `omitted`. Both are in the JSON report and in the markdown. They stand in for the number of `bundle <ID>` calls after one `context`, because the skill runs `bundle` for each `body_omitted` ID. Refs: REQ-STAT-008
- D3 Candidates. A prototype in the working tree measured each one on both repos at budget 8000. The prototype is gone. This list keeps the numbers. Figures are for this repo and count full bodies only. Columns: recall, full body_recall, `body_omitted_mean`, `truncated_mean`.
  - Baseline: 1.00, 0.7963 (43 of 54), 2.35, 7.25. `card_only` 11.
  - a. Bodies of class 0 before the cards of class 1: 0.8246, 0.907 (49 of 54), not recorded, not recorded. Recall falls under the 0.95 target. Rejected.
  - b. Class 0 bodies shortest first: 1.00, 0.7963. No gain.
  - c. Bodies of a `main version of` copy last: 1.00, 0.7963. No gain. Archived tasks have no such copy.
  - d. A cap on structural bodies, or priority for cited bodies over them: no change by construction. `bodies(2)` already runs after `bodies(0)`. Not built.
  - e. Named path cards after the class 0 bodies: 0.9912, 0.7963. Rejected.
  - f. A statement before scenarios, split at `#### Scenario:`: 1.00, 0.7963, 2.35, 7.3. One cited requirement prints its statement and nothing else gains. `card_only` 10. No full body added.
  - g. The second and later line cards of a file fill after the cited bodies: 1.00, 0.7963, 2.05, 7.95. No full body added.
  - g with f: 1.00, 0.7963, 2.05, 8.75. Four statements print. No full body added. The statement pass pushes more class 2 cards into `truncated`, 7.25 to 8.75 IDs a run.
  - g with the named path cards after the bodies: 0.9825, 0.833 (45 of 54), 1.95, 9.6. Recall falls by 2 labels. Chosen by the owner on 2026-11-07.
  - h. A default budget of 8500, 9000, and 10000 (the labels file is not changed, the run used a copy): 1.00 at each. Full body_recall 0.7963, 0.7963, and 0.889 (48 of 54). `body_omitted_mean` 2.4, 2.2, 1.65. Maximum answer 10,089 characters at 10000.
  - The fixture stayed at recall 1.00 and `body_recall` n/a in every run.
- D4 Decision. On 2026-11-07 the owner chose "g with the named path cards after the bodies". No candidate reaches 0.8 in full bodies with recall at 1.00 and the budget at 8000. This one reaches 0.833 and costs 2 labels, so recall is 0.9825 (112 of 114). The ADR-007 target of 0.95 holds. f adds no full body and stays out. REQ-QRY-027 is the rule. Refs: REQ-QRY-027
- D5 Rule. The cards of class 1 split in two. After the cards of class 0, the first line card of each file (code or test) keeps the class 1 fill. First means first in print order, the order of the ID strings, so `src/a.ts:100` is before `src/a.ts:9`, not the lowest line. The second and later line cards of a file get class 7. The `named by` path cards get class 5. The fill order becomes: cards of 0, cards of 1, bodies of 0, cards of 5, cards of 7, cards of 2, bodies of 2. The print order does not change, because the blocks keep their place in the array. REQ-QRY-020 stays as it is. REQ-QRY-027 says that it replaces the class 1 place that REQ-QRY-020 and REQ-QRY-021 give, because the text of REQ-QRY-020 is near the 500 character limit. Refs: REQ-QRY-027
- D6 Cost, measured on the prototype. Recall of this repo 0.9825 (112 of 114), reqs 1.00, code 1.00 (30 of 30), tests 0.933 (28 of 30). The fixture stays at 1.00. Two labels are lost, both test files that no tag links to a cited requirement. A task line names each, so each printed as a `named by` card before:
  - Task 046/2.1, `tests/query/related.test.ts`, kind `named by` card.
  - Task 052/1.1, `tests/check/strict.test.ts`, kind `named by` card.
  - `truncated_mean` rises from 7.25 to 9.6. The pass moves cards that do not fit into `truncated:`. The maximum answer is 8,473 characters, 6 percent over 8000. A requested task block always prints. Refs: REQ-QRY-027
- D7 Checks. `node scripts/recall.mjs --labels bench/recall/spec-ctx.json --root . --check` tests the labels against the repo and asserts no recall target, so it passes at 0.9825. The prototype passed the tests of `tests/query`, `tests/tasks`, `tests/gov`, `tests/journal`, `tests/stat`, and `tests/cli`. It passed `bash tests/parity/run.sh` too. So no golden changes. Tests that pin card order and stay as they are unless a run fails: `tests/query/cards.test.ts`, `tests/query/named-paths.test.ts`, `tests/query/trust.test.ts`, `tests/query/bundle.test.ts`, `tests/query/budget.test.ts`, and `tests/fixtures/parity-golden/bundle.out`. Refs: REQ-QRY-027
- D8 Record. `docs/verification/064.md` holds the before and after table (recall, `body_recall`, `card_only`, cited bodies lost, `body_omitted_mean`, `truncated_mean`, median and max chars, p95). It also holds the 2 lost labels and the candidate table of D3. The p95 comes from five timed runs of `context 046/2.1`. Refs: REQ-STAT-008
