# Proposal

## Why

ADR-008 sets one goal for 30 days. A stranger runs spec-ctx on a repo and gets a useful `context <task>` within 5 minutes. Today the README asks the stranger to read first. The first command is in `## Quickstart`, far below the fold. There is no block to copy and paste, and nothing keeps such a block true.

A block that a reader pastes and that fails is worse than no block. So a test must run the block.

## What changes

- The README gets `## Try it in two minutes` right after `## What spec-ctx adds`. It holds one bash block between `<!-- try:begin -->` and `<!-- try:end -->`. The block builds a toy project with one spec, one change, one task, and one source file. Then it runs `init --all`, `adopt`, `status`, `task next`, `task start`, a refused `task done`, the edit, a passing `task done`, `context src/login.ts`, and `handoff write`.
- Two lines under the block set expectations. The bundle footer on a toy tree passes 100 percent of the spec text, and on a real repo the share is small. `status` prints a `next:` line for plan approval, and the `specctx-run` skill handles that step.
- `scripts/try.sh` tells the same story for a clone. It runs the local `dist/cli.js` on a copy of `tests/fixtures/no-id-repo` plus `docs/demo/specs/`, so the bundle is a small share of the spec text. It prints a heading before each step and removes its temp dir.
- The owner asked on 2026-11-03 to shorten the README. Reference sections move to `docs/reference.md`. Nothing is deleted.
- A `cleanEnv()` helper in `tests/helpers.ts` for both tests. `try.sh` also runs `context add-mfa/1.3`, the north star command.
- Two tests. One extracts the marked block, swaps `npx -y spec-ctx` for `node <root>/dist/cli.js`, runs it with bash in a temp dir, and checks exit 0 and two lines. One runs `scripts/try.sh`. Both run in `bun run test`, so they run in `bun run ci:local`.
- New requirements REQ-GOV-012 and REQ-GOV-013 in `spec-governance`, next to the demo story REQ-GOV-008.
- CHANGELOG entry and a verification record.

## Layers and benefit

- Layer: this change serves the first run reaching layer 1. It adds no engine code. The block ends on `context src/login.ts`, a lookup by file, and `task start` shows the bundle of one task. A stranger sees retrieval work in the first two minutes, on their own machine.
- Benefit: the north star of ADR-008 is the minutes to the first useful `context`. The block gives a measured start of that path. The verification record gives the wall time and the command count from the paste to the first `context` that holds a code line. The test keeps the block true when the CLI output changes.
- It also keeps the links true. The block and the script are code that a test runs, so a README that lies fails `bun run ci:local`.

## Out of scope

- A change to any command, help text, or output of the CLI.
- A version bump or a release. The block uses `npx -y spec-ctx`, which fetches the published version. The test runs the local build. Until the next release, the two can differ.
- The `deferred:` notice of `check --strict`, the benchmark, and the fallback bundle. Those are other items of ADR-008.
