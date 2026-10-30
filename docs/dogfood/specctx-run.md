# Dogfood: five changes through the specctx-run skill

Date: 2026-10-30. Engine: this repository at each change's commit, after release 0.2.0. ADR-006 phase 1 sets the exit criterion: five changes in a row, archived through `specctx-run`, with only the two human stops and evidence_ratio 1.00.

An agent ran each change from a one paragraph request. It followed `skills/specctx-run/SKILL.md` and logged one line per loop turn. The lead answered the two human stops. The lead also wrote the request for each change, from the friction of the change before it.

## Result

| Change | Turns | Human stops | Verify failures | Gate failures | Stale catches by `next` | evidence_ratio |
| --- | --- | --- | --- | --- | --- | --- |
| 028-weak-verify | 10 | 2 | 1 | 0 | 0 | 1.00 (5/5) |
| 029-loop-friction | 16 | 2 | 0 | 0 | 0 | 1.00 (6/6) |
| 030-status-next | 12 | 2 | 0 | 2 | 0 | 1.00 (4/4) |
| 031-archive-stop | 19 | 2 | 1 | 0 | 3 | 1.00 (5/5) |
| 032-bracketed-templates | 11 | 2 | 0 | 2 | 1 | 1.00 (3/3) |

Source: the per change rows of `docs/metrics/2026-10-30.md` and the agent logs.

The exit criterion holds for spec-ctx itself: five changes, two human stops each, evidence_ratio 1.00 on each. The second part of the criterion, one change on Codex, did not run. It stays open.

## IDs

| Count | Value |
| --- | --- |
| New requirement IDs | 12 |
| New scenario IDs | 38 |
| IDs the agent typed without `specctx id new` | 0 |
| Duplicate IDs that `check` reported | 0 |
| Headers retitled under the same ID | 0 |

Every new ID came from `specctx id new`. The agent never picked a number. No change in this run retitled a header, so this run gives no data on renames. `tests/check/base.test.ts` covers the rename path (SCN-CHK-001-7).

## How the loop changed during the run

- 028 found that the plan stop lived only in the skill text. After planning, `next` returned `start` with `human: false`.
- 029 moved the plan stop into the engine. The skill runs `handoff ask --change <c>` and `next` returns `ask` until a human resolves the question.
- 030 made `status` end with the same command as `next`, and listed this repository's pre-archive steps under `operations.archive.guidance`.
- 031 gave the archive stop the same mechanism, through a `stage` field on the question. `next` also started to report stale evidence as `repair`, so a stale task shows up in the loop instead of at the gate.
- 032 ran with both stops in the engine and the plan step running `gate --strict`. The gate at the plan step caught two long sentences before the plan stop.

## Friction still open

- The upstream `openspec-propose` skill tells the agent to run `openspec show` and to finish with `/opsx:apply`. `specctx-run` forbids both. The agent used `specctx bundle` each time and ignored the prompt.
- `next` returns `repair` for one stale task at a time. The gate lists all of them. A change that edits one shared file in several tasks reopens each earlier task once.
- The `gate` bullet of the skill gives no route for stale-evidence findings.
- The scan reads a code tag inside a test string as a link, which gives `dangling-ref`. The hint does not name the cause.
- The archive guidance says to rebuild the index but does not name `specctx build`.
- `stats --write` names its file by the UTC date.
