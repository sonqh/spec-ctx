# Proposal

## Why

ADR-006 names four defaults that make the fresh path harder than it has to be. `init` writes the markdown globs of this repository into every new project, so the gate of a stranger lints prose that spec-ctx has no business in. `init` writes `[gate] openspec` as `@latest`, so a new upstream release can change the gate result with no edit in the project. `init --schema` keeps an existing `rules` key untouched, so a project that came from `openspec init` with its own rules never learns about `specctx id new`. And `.ctx/current.json` and `.ctx/gate-log.jsonl` are per session, but no `.gitignore` line keeps them out of git. Open questions live only in `.ctx/handoff.md`, a generated file, so `handoff write` has to carry them from its own previous output. ADR-006 item 1 moves them to a file of their own.

## What Changes

- The code default of `[gate] markdown` becomes `[]`. `init` writes `markdown = []` with a comment that says how to turn the lint on. A project with no key lints nothing. This repository and its CI pass `--markdown` on the command line, as they do today.
- `init` detects the OpenSpec version with `npx -y @fission-ai/openspec@latest --version` and writes `openspec = "npx -y @fission-ai/openspec@<version>"`. A failure or a 60 second timeout keeps `@latest` and prints one note. The env var `SPECCTX_OPENSPEC` at init time short circuits the detection.
- `init --schema` merges the `rules` and `operations` items of the fragment into an existing key, item by item. An item that exists byte for byte is not added twice. The output line is `merged openspec/config.yaml rules (<n> added)`.
- `init` writes four `.gitignore` lines: `.ctx/index.json`, `adopt-report.md`, `.ctx/current.json`, `.ctx/gate-log.jsonl`.
- Open questions move to `.ctx/questions.json`. `handoff ask` appends, `handoff resolve <n> <answer>` updates, `handoff write` renders both lists from the file. The first `handoff write` that finds questions in an old `handoff.md` and no `questions.json` migrates them once. `handoff.md` shows the last 10 resolved entries and one line `and <n> more in .ctx/questions.json`.
- REQ-DIST-002 gets SCN-DIST-002-10 and new text in SCN-DIST-002-5 and SCN-DIST-002-6. REQ-SCH-003 gets SCN-SCH-003-6. REQ-HND-001, REQ-HND-002, and REQ-HND-003 name `questions.json`. REQ-HND-002 gets SCN-HND-002-2, SCN-HND-002-3, and SCN-HND-002-4.

Out of scope: the `[gate] base` key, the `retitle-needs-renamed` rule, the removal of `task backfill`, and the path tests on upstream OpenSpec. Change 023 covers the path tests.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `distribution`: REQ-DIST-002.
- `schema-bundle`: REQ-SCH-003.
- `handoff`: REQ-HND-001, REQ-HND-002, REQ-HND-003.

## Impact

- `src/config.ts`, `src/init/init.ts`, `src/handoff/handoff.ts`, `src/handoff/questions.ts`, `src/cli/status.ts`, `src/cli/workflow.ts` (two output lines in the handoff cases).
- `tests/config.test.ts`, `tests/init/init.test.ts`, `tests/handoff/handoff.test.ts`, `tests/helpers.ts`, `tests/paths/existing.sh`.
- `.gitignore`, `README.md`, `CHANGELOG.md`, `docs/verification/022.md`.
