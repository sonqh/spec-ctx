# Proposal

## Why

`bun run ci:local` fails on every branch with an active change that holds an open task. The failed test is `tests/gov/governance.test.ts` SCN-GOV-001-1. It copies this repository, runs `check --strict`, and expects no line besides the summary and the `manual-evidence` warnings. Change 052 added the `deferred:` notice (REQ-CHK-010), and REQ-CHK-004 allows it after the summary. The test does not know the notice, so it fails on two assertions:

- The filter keeps the `deferred:` line, which holds two spaces.
- The regex `^0 findings\n$` expects that the output ends right after the summary.

052 did not see it, because no change was open when its tests ran. 054 met it at its plan stop on 2026-11-04.

## What changes

- The test drops the `deferred:` lines before both assertions. A `deferred:` line is a notice, not a finding.
- A new case, SCN-GOV-001-2, copies the repository, adds an active change with one open task, and expects the same pass. It holds on `main` too, where no change is open.
- Spec: MODIFIED REQ-GOV-001 with the new scenario SCN-GOV-001-2.

## Layers and benefit

- A bug fix in the governance test that keeps the links true (ADR-007 item 4). It unblocks 054, which is layer 1. No engine code changes. ADR-008 item 4 allows bug fixes during the freeze.
- `ci:local` and CI pass again at every plan stop, so change 054 can push.

## Out of scope

- Any change to `check` or to the `deferred:` notice.
- A version bump.
