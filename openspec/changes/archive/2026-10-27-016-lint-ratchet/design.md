# Design

## Decisions

- D1 One ratchet. `.ctx/baseline.json` stays one sorted list of strings. A lint line reads `lint <file> <rule> <count>`. `<rule>` is `tells:<rule>` or `ste:<rule>`, so the two linters never collide. `<count>` is the number of hard findings of that rule in that file at write time. Advisory findings never enter the baseline, because they never fail the gate.
- D2 Count, not position. A baseline keyed by line number breaks on the first edit above the finding. A key by matched text breaks on a reworded sentence that keeps the problem. A count per file and rule survives both and matches what the person cares about: did this file get worse. This is how `eslint --max-warnings` and `ruff` ratchets work.
- D3 `gate` computes the current counts with the same globs it lints, reads the baseline, and sums `max(0, current - baselined)` over every key. A key with no baseline line has a baseline of 0. The sum above 0 fails the step. The failure output lists one line per key that rose: `<file>  <rule>  <current> (baseline <n>)`, worst first, at most 50 lines, then `... <k> more line(s)` when cut. `--json` lists every key.
- D4 `baseline write` and `baseline prune` lint the same globs as `gate`. `write` records the current counts and replaces older lint lines. `prune` drops a line whose current count is 0 and lowers a line whose current count is below its baseline. `pruned <n>` counts dropped and lowered lines together.
- D5 The globs live in `spec-ctx.toml` under `[gate] markdown`, a list of strings. The default is the current `DEFAULT_MARKDOWN` split on spaces, so a project without the key behaves as today. `--markdown <globs>` on `gate` overrides the key for one run. `baseline` takes no `--markdown` flag: the baseline describes the configured gate, not a one off run.
- D6 The `tells` linter still fails on its own `--baseline 0` when run by hand. The gate no longer calls the linters with a count baseline. It calls them and compares per key. The old global `baseline 0` line in the gate detail goes away.
- D7 The existing path does not change its five commands. `baseline write` now also records the lint debt, so `gate --strict` exits 0 on day one. New prose that breaks a rule in a file that was clean, or that raises a count, fails the gate. `tests/paths/existing.sh` writes one markdown file with a dash and a semicolon into the temp copy before the path runs.

## Risks / Trade-offs

- A count ratchet hides a new finding when another finding of the same rule in the same file went away in the same edit. The count stays level. This is the known cost of count ratchets. The lint commands run by hand still show every finding.
- `.ctx/baseline.json` of a large adopter grows by one line per file and rule. On the OpenSpec fork that is about 600 lines. The file holds 5,500 lines today.
- A project that pinned the gate to a narrow `--markdown` in a script keeps working. The flag stays.

## Open Questions

None.
