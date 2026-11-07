# Proposal

## Why

ADR-010 item 3.1 sets one measure for the next 30 days: the share of cited requirement bodies that print inside the default budget. Nothing reports it today. `cited_body_lost` counts the losses and never the share. On this repo 11 of 54 labelled, cited requirements print as a card with `| body omitted`. The share is 0.7963. The agent then runs `bundle <ID>` for each one.

The first guess was that structural delta cards and bodies fill the budget before the cited bodies. The measurement says no. The fill order already puts the bodies of cited requirements (class 0) before every structural body (class 2). The budget runs out for three reasons. One cited body costs 1,200 to 2,300 characters. The task body costs 2,500. The code and test cards cost 2,000. `design.md` lists the candidates and their numbers.

On 2026-11-07 the owner chose the candidate that gives the most full bodies. The repeat line cards of a file and the `named by` path cards fill after the cited bodies. It costs 2 recall labels. The ADR-007 target of 0.95 holds.

## What changes

- `scripts/recall.mjs` reports `body_recall` (full bodies only), `body_omitted_mean`, and `truncated_mean` per repo, next to `recall` and `card_only` (REQ-STAT-008). The two means are a proxy for the `bundle <ID>` calls after one `context`.
- The second and later line cards of one file, and the `named by` path cards, fill after the bodies of class 0 (REQ-QRY-027). The first line card of each file keeps its place. The first four columns, the anchor, and the print order stay.
- A sentence in `docs/reference.md` names the rule.
- `docs/verification/064.md` holds the before and after table of both repos, the 2 labels that recall loses, and the candidate table.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `query`: ADDED REQ-QRY-027. REQ-QRY-020 stays as it is. REQ-QRY-027 states that it replaces the class 1 place of these cards.
- `metrics`: ADDED REQ-STAT-008.

## Layer and benefit

- Layer: layer 1, retrieval. It is item 3.1 of ADR-010.
- Measure: `body_recall` on this repo at the default budget of 8000. Before 0.7963 (43 of 54). Prototype after 0.8333 (45 of 54). The target of 0.8 is met. Recall goes from 1.00 to 0.9825 (112 of 114). The target of 0.95 holds.
- Benefit: the agent gets 2 more cited bodies in one `context` answer and runs `bundle <ID>` less. `body_omitted_mean` falls from 2.35 to 1.95. The cost: `truncated_mean` rises from 7.25 to 9.6, and 2 test files that only a task line names no longer print.

## Out of scope

- A change to `bench/recall/*.json`, to the default budget, or to the card columns.
- A statement before scenarios. It adds no full body.
- The scanner, stale by tag, archive hygiene, `impact`, and the query log (ADR-010 items 3.2 to 3.6).
