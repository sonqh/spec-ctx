# Design

## Context

OpenSpec matches a delta block to its main requirement by the header text after `### Requirement:`. Putting an ID in front of that text changes the match key. So `adopt` must rewrite the main header and every delta header that points at it in the same write, or the next archive refuses the delta.

## Goals / Non-Goals

**Goals:**
- `adopt` on a real OpenSpec project is one command, idempotent, and reviewable as a diff.
- Strict mode is usable on day one of adoption.
- The fresh path and the existing path are both tested end to end in CI.

**Non-Goals:**
- Guessing which code implements which requirement. Tags stay a human or agent task.
- Touching `openspec/changes/archive/`. Archived text is history.

## Decisions

- CAP for a capability without an entry in config comes from the folder name. Take the upper case first letter of each kebab segment, at most 6 letters, three letters for a one segment name. On a collision take two letters from the first segment, then three, then a letter suffix. Digits never appear, so every code matches `[A-Z]{2,6}`. `user-auth` gives `UA`, `profile-schema` gives `PS`. `adopt` writes every derived code into `spec-ctx.toml` so the user can rename it before the IDs spread. Follows ADR-002. Creates no ADR.
- Numbers follow order of appearance in the main spec. Scenarios get `-1`, `-2` in order under their requirement. A requirement that exists only in an active ADDED block gets the next number after the main spec's last one for that code. Creates no ADR.
- Atomic write: `adopt` builds every new file content in memory, then writes all files, then runs `check`. On any `check` finding other than those already in the baseline, it restores the originals from memory and exits 1. Follows ADR-003.
- Baseline is a sorted JSON list of `rule id` pairs at `.ctx/baseline.json`, committed. `check --strict` drops findings that are in the list. `baseline prune` removes entries that no longer fire. There is no `baseline add`: new debt is a finding. Follows ADR-004 in spirit: the ratchet only moves one way.
- `task backfill` reuses the `task done --manual` path for every ticked task without evidence, so the evidence shape stays one. Follows ADR-004.
- The report `adopt-report.md` lists each file, old header, new header, and the derived CAP codes. It is written next to `spec-ctx.toml` and is meant to be read in the pull request, then deleted. Creates no ADR.

## Risks / Trade-offs

- A project with two requirements that share a header text in one spec cannot be matched. `adopt` stops and names them. Mitigation: that is also an OpenSpec bug in the project, and the message says how to fix it.
- Derived CAP codes can be ugly. Mitigation: the report shows them and the config holds them. rename before the first commit.
- A delta whose header text already differs from main (a RENAMED in flight) gets the ID through the RENAMED mapping, not through text match. With no RENAMED block, `adopt` leaves that delta header untouched and reports it.
