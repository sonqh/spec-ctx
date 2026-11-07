# Tasks

Run `bun run build` before every Verify. Tests write only under a temp dir and never reach the network. Each shared file changes in one task only.

## 1. The trust state

- [x] 1.1 Write `src/graph/trust.ts`: `provenanceClass`, `taggedReq`, and the `Trust` class with `taskState`, `reqState`, and `lineVerified`, as 062/D1 to 062/D3 say. It reads each evidence file once and hashes each file once. Write `tests/query/trust.test.ts` first, with SCN-QRY-023-1 to SCN-QRY-026-4, on temp projects where `task done` writes real evidence. [REQ-QRY-023, REQ-QRY-024, REQ-QRY-025] Verify: `bun run build && bun test tests/query/trust.test.ts && npx vitest run tests/query/trust.test.ts && bun run typecheck`

## 2. The card and the JSON

- [x] 2.1 In `src/graph/bundle.ts` append the trust columns to each card through `provenance(e, reason, trust)`, give the named path card `declared`, and add `used` and `blocks` to `BundleResult`, as 062/D4 and 062/D5 say. Block mode in `src/cli/commands.ts` prints `used` equal to `chars` and an empty `blocks`. Update the tests that end a card with the reason: `tests/query/bundle.test.ts`, `cards.test.ts`, `change-cli.test.ts`, `file-cli.test.ts`, `named-paths.test.ts`, `requested.test.ts`, `structural.test.ts`, `task-reach.test.ts`, `uncited-note.test.ts`, and `tests/tasks/start.test.ts`. Record the parity golden with `bash tests/parity/run.sh --record` and note it in `docs/verification/062.md`. [REQ-QRY-026, REQ-QRY-020, REQ-QRY-023] Verify: `bun run build && bun test tests/query tests/tasks tests/journal tests/stat tests/loop && npx vitest run tests/query tests/tasks && bash tests/parity/run.sh && bun run typecheck`

## 3. Help, docs, and skills

- [x] 3.1 Add the trust labels to the `--budget` help of `bundle` and `context` in `src/cli/help.ts` and re-record the help goldens. Name the columns in `README.md`, `docs/reference.md` (with a fresh sample of `context 045/2.1`), `.claude/skills/bootstrap-context/SKILL.md`, and `skills/specctx-run/SKILL.md`, then run `node dist/cli.js init --skills --force`, as 062/D7 says. [REQ-QRY-023, REQ-QRY-024] Verify: `bun run build && bun test tests/cli tests/skills tests/gov && node dist/cli.js lint tells --baseline 0 README.md docs/reference.md skills/specctx-run/SKILL.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation README.md docs/reference.md skills/specctx-run/SKILL.md && bun run typecheck`

## 4. Measure and record

- [x] 4.1 Measure p95 of `context 046/2.1 --budget 8000` over 5 runs after the change. It was 118 ms before. Run `node scripts/recall.mjs --labels bench/recall/spec-ctx.json --check`. Run recall on this repo with `node scripts/recall.mjs --labels bench/recall/spec-ctx.json --out <tmp>`. Write `docs/verification/062.md` with the figures, the golden note, and the recall before and after, as 062/D6 says. Add a paragraph under `## Unreleased` in `CHANGELOG.md`, headed `Change 062-trust-labels.`, that names REQ-QRY-023 to REQ-QRY-026. [REQ-QRY-026, REQ-QRY-025] Verify: `grep -q "REQ-QRY-023" CHANGELOG.md && grep -q "p95" docs/verification/062.md && git diff --quiet -- bench/recall && node dist/cli.js lint tells --baseline 0 docs/verification/062.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation docs/verification/062.md`
