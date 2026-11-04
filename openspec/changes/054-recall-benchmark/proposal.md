# Proposal

## Why

ADR-007 item 6 asks for proof that layer 1 returns the right context. ADR-008 item 3 makes that proof the measuring stick for the next changes. Change D (a useful bundle before any hand tag) and change F (trust labels) must show numbers before and after.

Today spec-ctx measures only size. `stats` reports `context_ratio`, the bundle size divided by all spec text. A bundle can be small and still miss the file that an agent must edit. Nothing measures that.

Two facts from the planning probe:

- `context` on this repo for 053/1.1 printed 14 entries in 8,101 characters. It omitted 12 decisions. It did not print `scripts/try.sh`, the file that 053 changed, because `scripts/` is not a scan path.
- The frozen fixture `sonqh/OpenSpec-spec-ctx` at 8899171 has 28 active changes and 118 open tasks. None cites a requirement, and no file carries a code tag. `context add-status-next-step/1.1` still printed the delta requirement through the structural edges of change 046, in 110 ms. Its `spec-ctx.toml` scans `tests/**`, but the repo keeps its tests in `test/`.

## What changes

- A new script, `scripts/recall.mjs`. It reads a label file, runs `node dist/cli.js context <task>` once per labelled task, and compares the printed entries with the labels. It reports recall within the budget, the bundle size, and the p95 time. It is a script, not a CLI command. The CLI surface does not change.
- A wrapper, `scripts/recall.sh`. It clones the fixture read only at the pinned commit into a temp dir, then runs the script on this repo and on the clone. It is the only part that uses the network.
- Two label files, `bench/recall/spec-ctx.json` and `bench/recall/openspec-fixture.json`, with 20 tasks each. A seeded sample picks the tasks. The lead drafts the labels by hand. The owner reviews them. After the review they stay frozen for D and F.
- The first report, `docs/metrics/recall-2026-11-04.md` and `docs/metrics/recall-2026-11-04.json`. This is the baseline before D and F.
- Spec: a new requirement REQ-STAT-006 in `metrics`, with five scenarios.

## Layers and benefit

- Layer 1, retrieval. The change does not make retrieval better. It measures how good retrieval is, on two repos, against the targets of ADR-007 item 6.
- D and F then show a number before and after, not a claim.
- It adds no engine code and no CLI command. The ADR-008 freeze is not touched.

## Out of scope

- Any change to `context`, `bundle`, the index, or `init`. The two findings above go to D and E.
- A CI job for the benchmark. The timing depends on the machine, and the fixture needs the network.
- A version bump.
