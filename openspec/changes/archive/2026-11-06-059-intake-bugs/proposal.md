# Proposal

## Why

Three GitHub issues from the ADR-009 bug intake.

- #13. `id new SCN <CAP> --for <REQ>` prints the same ID twice before `build`. `id new` reads only the index and reserves nothing. This is by design (ADR-003: no hidden state). An agent that allocates IDs in a loop gets duplicates. The contract is unclear, not the design.
- #15. `errInfo` in `src/journal/note.ts` keeps frames whose file is not an absolute path, such as `node:internal/modules/run_main:12` and `<anonymous>:1`. This happens when the working directory is under the package root. It breaks the rule of REQ-JRN-002: package frames only. It leaks nothing private.
- #16. The help page of `report` lists `--json`, but `report` ignores it and prints Markdown.

## What changes

- #13. The help page of `id new` and the `specctx-run` skill say that a second call before `build` returns the same ID, and that `--count <n>` gets several. The skill copies under `.claude/skills` and `.agents/skills` get the same text. The code of `id new` does not change.
- #15. `errInfo` skips a frame whose file is not absolute, after the URL conversion. One test case in the journal tests.
- #16. `report --json` exits 2 with a usage error. The `report` page drops `--json` from its flags, as the lint pages do, and its exit 2 line says so. One test.
- The help golden is re-recorded for the changed pages and summary lines, with `SPECCTX_HELP_RECORD=1 bun test tests/cli/help.test.ts`. The note goes in the verification record. No parity golden changes.
- A CHANGELOG entry under `## Unreleased` names the three issues.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `id-allocation`: ADDED REQ-IDS-006, the repeat call before `build`. It links to REQ-IDS-001, REQ-IDS-002, and ADR-003.
- `journal`: ADDED REQ-JRN-007 (absolute package frames) and REQ-JRN-008 (report takes no JSON flag). They link to REQ-JRN-002 and REQ-JRN-004.

No existing requirement states the wrong behavior, so no MODIFIED block.

## Layer and benefit

- Layer: layer 2, bug fixes from the ADR-009 bug intake and ADR-007 item 3 (a layer 2 change that fixes a bug is in scope). It changes no retrieval output.
- Benefit: the `plan` action of `specctx-run` and any agent stop allocating duplicate IDs. The journal keeps only package frames, as its rule says. The `report` page stops promising output that it does not give.

## Out of scope

- A reservation file or any hidden state for `id new` (ADR-003).
- A `--json` output for `report`.
- A change to `package.json` version.

## Impact

- Code: `src/journal/note.ts`, `src/cli/commands.ts`, `src/cli/help.ts`.
- Tests: `tests/journal/journal.test.ts`, `tests/journal/cli-report.test.ts`, `tests/ids/new.test.ts`, the help golden in `tests/fixtures/help-golden/` (via `tests/cli/help.test.ts`).
- Skills: `skills/specctx-run/SKILL.md` and its two copies. `tests/init/drift.test.ts` and `tests/skills/*.test.ts` read them.
- No new dependency. No parity golden changes.
