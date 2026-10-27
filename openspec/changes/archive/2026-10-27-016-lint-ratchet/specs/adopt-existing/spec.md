# adopt-existing (delta)

## ADDED Requirements

### Requirement: REQ-ADOPT-007 Lint ratchet
`baseline write` SHALL record one `lint <file> <rule> <count>` line per file and rule with hard lint findings on the gate globs. `<rule>` is `tells:<name>` or `ste:<name>`. `gate` SHALL fail the lint step when a count rises above its line. The detail has one line per risen key, worst first, at most 50 lines, then `... <k> more line(s)`. `baseline prune` SHALL drop a line whose count is 0 and lower a line whose count fell.

Refs: REQ-ADOPT-005, REQ-CLI-004

#### Scenario: SCN-ADOPT-007-1 Day one gate on dirty prose
- **WHEN** the no-ID fixture holds a `docs/notes.md` with one dash and one semicolon, and the existing path runs
- **THEN** `.ctx/baseline.json` holds `lint docs/notes.md tells:dash 1` and `lint docs/notes.md ste:semicolon 1`, and `gate --strict` exits 0

#### Scenario: SCN-ADOPT-007-2 A rise fails the gate
- **WHEN** `docs/notes.md` gains a second dash after the baseline
- **THEN** `gate` prints `linters: fail, 1 new finding(s) in 1 file(s)` and `docs/notes.md  tells:dash  2 (baseline 1)`, and exits 1

#### Scenario: SCN-ADOPT-007-3 Prune lowers and drops
- **WHEN** the semicolon leaves `docs/notes.md` and one of two baselined dashes leaves, and `baseline prune` runs
- **THEN** it prints `pruned 2`, the `ste:semicolon` line is gone, and the `tells:dash` line reads `1`
