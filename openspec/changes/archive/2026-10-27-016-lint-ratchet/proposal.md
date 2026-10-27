# Proposal

## Why

With change 015, `check --strict` exits 0 on the OpenSpec fork. `gate --strict` still fails at its second step. The linters run on every markdown file of the adopter with the default globs. The fork never wrote STE prose. The result: 2,096 hard findings in 279 files, 1,535 of them inside `openspec/`, 1.1 MB of output, no summary line. The adopter has no way to accept that debt and move on. `check` has a ratchet in `.ctx/baseline.json`. The linters have none. So the existing path of REQ-ADOPT-006 cannot end with `gate --strict` exit 0 on a real repository, and `gate` is unusable for a stranger. `docs/dogfood/openspec.md` holds the run.

## What Changes

- The linters join the one ratchet the engine already has. `baseline write` records one `lint <file> <rule> <count>` line per file and rule with hard findings. `gate` fails only when a count rises above its baseline line. `baseline prune` lowers or drops the lines that no longer fire. No second mechanism, no line numbers, no hashes.
- `gate` prints one summary line for the lint step: `linters: fail, <n> new finding(s) in <m> file(s)` or `linters: ok (<f> file(s), <b> baselined)`. The detail that follows a failure stops at 50 lines and says how many it left out. `--json` keeps every line.
- `spec-ctx.toml` gets `[gate] markdown`, the globs the gate lints. `init` writes it with the current default. `--markdown` on the command line still overrides it.
- REQ-CLI-004 gets SCN-CLI-004-4 and SCN-CLI-004-5. REQ-ADOPT-007 is new, with SCN-ADOPT-007-1 to -3. REQ-DIST-002 gets SCN-DIST-002-5.

Out of scope: a change to any lint rule, the `--baseline N` flag of `lint tells` and `lint ste`, and the exit code of `adopt --dry-run`.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `cli`: REQ-CLI-004.
- `adopt-existing`: REQ-ADOPT-007 added.
- `distribution`: REQ-DIST-002.

## Impact

- `src/cli/gate.ts`, `src/baseline/baseline.ts`, `src/config.ts`, `src/cli/commands.ts`, `src/cli/help.ts`, `src/init/init.ts`.
- `tests/cli/gate.test.ts`, `tests/baseline/baseline.test.ts`, `tests/config.test.ts`, `tests/paths/existing.sh`.
- `CHANGELOG.md`, `README.md` (the existing path section).
