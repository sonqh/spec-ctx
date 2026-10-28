# Design

## Decisions

- D1 `GATE_STEPS` becomes `check`, `baseline`, `lint tells`, `lint ste`, `validate`, `spec-length`. The new step runs after `check` and before the linters, so a hidden finding fails the gate before any lint line. The gate log names `baseline` as `failed_step`. Follows ADR-006 item 6.
- D2 `src/baseline/ratchet.ts` holds two pure parts and one git part. `newEntries(current, base)` takes two lists of lines and returns the lines that are new debt. A line that is not in the base set is new. A `lint <file> <rule> <count>` line with a count above the base line for the same key is new, and the returned line reads `lint <file> <rule> <count> (base <n>)`. `baseAtMergeBase(root, base)` runs `git merge-base HEAD <base>` and `git show <sha>:.ctx/baseline.json` with `spawnSync`. It returns the lines, or a skip reason: `no git repository`, `no merge base with <base>`, or `no .ctx/baseline.json at <sha7>`. No new dependency. Follows ADR-001 and ADR-003.
- D3 The step output. Skip prints `baseline: skipped (<reason>)` and passes. New debt prints `baseline: fail, <n> new entr(y|ies)`, then one line per entry sorted, at most `LINT_DETAIL_CAP` lines, then `... <k> more line(s)`. `--json` keeps every line. A pass prints `baseline: ok`. A local file that is absent counts as an empty list, so a deleted baseline always passes.
- D4 The exception. `GateOpts.baselineSubject` holds the subject. `commands.ts` passes `process.env.SPECCTX_BASELINE_SUBJECT`, and `gate.ts` falls back to `git log -1 --format=%s HEAD`. On a pull request the CI checkout is a merge commit whose subject starts with `Merge`. The step then also reads the subject of `HEAD^2`, the pull request head, so a `baseline:` commit at the tip of the branch passes in CI. A subject that starts with `baseline:` prints `baseline: ok (baseline: commit)` and skips the compare. Same pattern as REQ-GOV-007.
- D5 `Config.gate.base` is a string with the default `origin/main`. `loadConfig` rejects a value that is not a string or is empty with `spec-ctx.toml: gate.base must be a string that is not empty.` `INIT_TEXT` gets the key under `[gate]` with a one line comment. The key count in SCN-DIST-002-2 goes from 13 to 14. REQ-DIST-002 does not list the key yet. A later change adds it with the other `[gate]` keys.
- D6 The `specs` job in `.github/workflows/ci.yml` checks out with `fetch-depth: 0`. Without it, a pull request checkout has no `origin/main` and the step prints `skipped` on every run. The `run` lines stay the same, so `scripts/ci-local.sh` needs no edit.
- D7 Tests build a temp git repo with `git init`, two commits, and a remote `origin` that points at the repo itself, fetched once. The default `origin/main` then resolves with no config edit. A second test uses `[gate] base = "main"` on a branch.

## Risks / Trade-offs

- A project that fetches with depth 1 in CI gets `baseline: skipped` on every pull request. The README names `fetch-depth: 0`.
- A squash merge loses the `baseline:` subject of the branch commit. That is fine. After the merge, `main` compares the file with itself.
- `git show` reads the file at the merge base, not at the base branch tip. A baseline that grew on `main` after the branch point does not count against the branch.

## Open Questions

None.
