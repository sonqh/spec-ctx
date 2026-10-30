# Replay of gate --rerun

ADR-006 phase 2 sets an exit criterion: two weeks of replay on spec-ctx and one external repository with zero flaky failures. `scripts/replay-rerun.sh` measures it.

## What it does

- It visits each first-parent commit on the current branch of a repository since a date. It starts with the oldest. It skips a root commit.
- It makes a git worktree of the commit under a temp dir. It removes the worktree at the end, also on failure.
- It runs the `--setup` command once in the worktree, if you give one.
- It runs `gate --rerun --base <commit>^1 --json` in the worktree N times. `SPECCTX_RERUN` is unset for these runs.
- The engine is always `dist/cli.js` of this repository. The new engine judges old trees.
- A task is flaky when its runs give more than one result.

## Run it on spec-ctx

Build first. Then replay from the root of this repository.

```bash
bun run build
scripts/replay-rerun.sh . --since 2026-10-30 --runs 3 --setup "bun install --frozen-lockfile"
```

## Run it on an external repository

The repository must use spec-ctx, so its commits close tasks with evidence. Replace the path, the date, and the setup command.

```bash
bun run build
scripts/replay-rerun.sh ../other-repo --since 2026-10-16 --runs 3 --setup "npm ci" --out ./replay-other
```

- The script never writes into the repository. It adds a worktree entry under `.git` and removes it at the end.
- The script uses the current branch. Check out the branch you want before you start.

## Options

- You must give `--since <date>`. Any date that `git log --since` accepts works. A bare `YYYY-MM-DD` means midnight of that day.
- `--runs N` sets the runs per commit. The default is 3.
- `--setup <command>` runs once per worktree. A failed setup is an error for that commit.
- `--out <dir>` sets the output folder. The default is a temp dir. The script prints it at the end.

## Output

- `replay.jsonl` has one JSON line per commit.
  - `commit`, `date`, and `runs`.
  - `tasks`: one entry per task, with `id`, `results` (one result per run), and `flaky`.
  - `error`: set when the command did not run. Examples are a failed setup and no merge base.
- `summary.md` has the counts: commits, tasks, ok, mismatch, no-evidence, verify-drift, flaky, other, and errors.
  - A flaky task counts under flaky only.
  - An error counts apart from flaky.

## Exit codes

- `0`: no task is flaky. A mismatch alone is data.
- `1`: at least one task is flaky.
- `2`: a usage error.

When no commit matches `--since`, the script prints `replay: 0 commits since <date>` to stderr. It still exits 0.
