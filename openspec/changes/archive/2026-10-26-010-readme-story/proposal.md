# Proposal

## Why

The owner read the README on GitHub on 2026-10-26 and did not see the benefit. A frame by frame look at the demo agrees.

- The first sentence has 30 words, two clauses, and the number 0.0502 with no scale. A reader who does not know OpenSpec stops there.
- The quickstart comes before the reader knows what the tool does. `add-mfa/1.3` means nothing yet. The excerpt under it is plain spec text and shows no benefit.
- `## Why` cites internal counts: 72 of 88, 0.0502, 36 of 60 reopens. A stranger has no baseline and does not know the word reopen.
- The demo has no story. White text scrolls for 35 lines with no highlight. The work step is a `printf`. The happy path is the only path. It ends on a `stats` table with three `n/a` rows and `debt 13`, which reads as a failure. The checkbox never appears on screen.
- Nothing shows the difference between a project with and without spec-ctx.

## What Changes

- The README opens with a tagline of at most 20 words and an audience line. Three problem bullets in plain words follow, then a Without and With table, then the demo and the quickstart. The measured numbers move to a `## Measured` section at the end. One line explains each column.
- The demo tells one story in five steps, with a caption before each command. The next task and its Verify command. A `task done` that fails and leaves the box open. The fix. A `task done` that passes, and the `git diff` of `tasks.md`. An edit and `check --strict` that flags stale evidence. No `stats`. Under 30 seconds.
- `task done` prints `Verify failed (exit <n>). The task stays open.` after the command output, so the refusal is one line a reader can find.
- Color on a TTY: green for a passed `task done` line, red for a failed one and for hard findings, dim for captions and `next:` lines. `NO_COLOR` or a pipe turns it off. The bytes without a TTY do not change, so goldens and parity stay.

Out of scope: new commands, metric changes, the Install and reference sections.

## Capabilities

### Modified Capabilities
- `cli`: color on a TTY.
- `task-workflow`: the failure line of `task done`.
- `spec-governance`: README order and the demo story.

## Impact

- `src/cli/color.ts` (new), `src/cli/workflow.ts`, `src/check/`, `README.md`, `docs/demo/record.sh`, `docs/demo/loop.*`, `tests/gov/readme.test.ts`, `tests/cli/`, `tests/tasks/`.
- `docs/metrics/` does not change. `README.md` cites the newest file in `## Measured` only.
