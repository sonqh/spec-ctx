# Design

## Context

Three of the four items are small. The linter port is the real work. It has the same shape as the engine port in 001: a Python oracle, a golden corpus, byte for byte parity.

## Goals / Non-Goals

**Goals:**
- `gate` runs with Node alone.
- Lint output is byte identical to the Python scripts on the corpus, including `--json`.

**Non-Goals:**
- Better rules. A rule that is wrong in Python stays wrong in TypeScript until a later change fixes both.

## Decisions

- Linter corpus: every markdown file in this repo and in agentrc at a pinned commit, plus the `--selftest` cases of both scripts. Goldens are the Python output for each file with the flags CI uses. Follows the 001 parity approach. Creates no ADR.
- Rule tables are data: one array per linter with `id`, `level`, `pattern`, `message`, ported regex by regex. JavaScript regex has no `(?<!...)` limits that matter here and no `\b` differences for ASCII. Each pattern gets one unit test with the Python match list. Creates no ADR.
- `--selftest` stays, because the ste-humanize skill README tells users to run it. Creates no ADR.
- `cwd=` is a prefix inside the first code span, not a new field, so OpenSpec and humans read the same line. Example: ``Verify: `cwd=tests/fixtures/no-id-repo npx openspec validate --all` ``. Follows REQ-VER-001.
- The 500 character check reads the active deltas only. Main specs already passed. Creates no ADR.
- Archive order: OpenSpec writes `archived: <ISO time>` into the `.openspec.yaml` of each archived change. Missing field falls back to folder name. Creates no ADR.

## Risks / Trade-offs

- Regex port errors. Mitigation: the corpus is about 150 files and the selftests exist for exactly this.
- Two linters in two languages during the transition. Mitigation: the Python scripts leave in the last task of this change.
