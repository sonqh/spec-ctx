# Design

## Context

Every number comes from files that already exist or from one new append-only log. No metric needs a database or a network call.

## Goals / Non-Goals

**Goals:**
- One command answers "what did spec-ctx do for this change" in under a second.
- The series in `docs/metrics/` survives a clone and reads as plain markdown.

**Non-Goals:**
- Precision beyond what file timestamps give. Cycle time is a median over tasks, not a stopwatch.
- Metrics for repos that do not use `task start`. Those get `context_ratio: n/a`.

## Decisions

- Five metrics, fixed names: `context_ratio`, `evidence_ratio`, `stale_catches`, `cycle_time_median_s`, `debt`. Every other number is a detail under one of them. Alternative: an open plugin list. Rejected because a stable set lets the series be compared across months. Creates no ADR.
- Gate log is JSON lines, one object per run: `at`, `ok`, `failed_step`, `duration_s`, `steps`. Appended by `ci-local.sh`, never rewritten. Committed, because a push that passed the gate carries its own proof. Follows ADR-004.
- `task start` writes `bundle_chars` into `.ctx/current.json`, and `task done` copies it into the evidence file. `context_ratio` is the mean of `bundle_chars / spec_chars` over tasks that have it. `spec_chars` is the size of canonical req, scn, and decision text in the index. Creates no ADR.
- `stale_catches` counts `.reopened-*.json` files whose reason contains `stale`. The reopen reason is free text, so the count is a lower bound. Creates no ADR.
- `debt` is one integer: baseline entries plus current `uncovered`, `scenario-untested`, `done-without-evidence`, and `manual-evidence` findings not in the baseline. Follows REQ-ADOPT-005.
- `--write` names the file by UTC date and overwrites it on the same day. Creates no ADR.

## Risks / Trade-offs

- A metric that looks good can be gamed by an agent, for example by `--manual` evidence. Mitigation: `evidence_ratio` shows exactly that, and `manual-evidence` warnings stay visible.
- The gate log grows one line per push. At 20 pushes a day it is 7,000 lines a year. Acceptable. `stats` reads only the tail by default.
