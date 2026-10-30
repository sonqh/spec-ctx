# Design

## Context

- `check` tests main-spec scenarios against `scn_named`, the set of scenario IDs that a test names.
- Delta scenarios are index entries of a change. The rule skips them today.
- `runInit` always calls `writeGitignore`. `--skills` adds skill files on top of the config step.
- `checkCap` in `src/ids/ids.ts` checks the code with one regex.

## Goals / Non-Goals

**Goals:**
- The plan step stays green. Tests may not exist yet.
- The archive does not bring a new finding.

**Non-Goals:**
- Stats, `next`, the action, and the replay script.

## Decisions

- D1 The delta rule reuses the `scn_named` test of the main rule. It runs for entries of an active change with status `active` or `modified`. Refs: REQ-CHK-008
- D2 A change counts as done when it has at least one task and no task is open. Refs: REQ-CHK-008
- D3 A skills refresh is `--skills` without `--schema`, with `spec-ctx.toml` present. It skips the `.gitignore` write, with or without `--force`. Plain `init` keeps its behavior. Refs: REQ-DIST-013
- D4 `checkCap` tests `<CAP>-<digits>` before the generic check and names the right form. Refs: REQ-IDS-005
