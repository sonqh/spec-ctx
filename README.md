# spec-ctx

spec-ctx ticks an [OpenSpec](https://github.com/Fission-AI/OpenSpec) task only after its Verify command passes and hands the agent one task of spec text, a context ratio of 0.0532 (`docs/metrics/2026-10-25.md`).

```bash
npx -y github:sonqh/spec-ctx#4490d188ad48 init --all
npx -y github:sonqh/spec-ctx#4490d188ad48 task next
npx -y github:sonqh/spec-ctx#4490d188ad48 task start add-mfa/1.3
```

```text
$ specctx task start add-mfa/1.3
-- REQ-UA-004 | openspec/changes/add-mfa/specs/user-auth/spec.md:5 | active | requested
### Requirement: REQ-UA-004 Second factor
The system SHALL ask for a TOTP code after a valid password.

#### Scenario: SCN-UA-004-1 Valid code
- **WHEN** the user enters the current TOTP code
- **THEN** the system opens a session

#### Scenario: SCN-UA-004-2 Expired code
- **WHEN** the user enters a code older than 30 seconds
- **THEN** the system rejects it
```

## Why

- Checkboxes lie. `task done` runs Verify and writes evidence, and 66 of 82 tasks hold it (evidence ratio 0.80).
- Context overflows. A bundle holds 0.0532 of the spec text on average (24 tasks).
- Evidence goes stale. The check caught 36 stale results in 59 reopens.

## Demo

![One task loop: status, task next, task start, an edit, task done, stats](docs/demo/loop.svg)

<details>
<summary>Transcript of the demo</summary>

```text
$ specctx status
index rebuilt
add-mfa  done 2  open 1
uncovered active REQs in main: 5
next: specctx task next
$ specctx task next
add-mfa/1.3  Add the TOTP prompt to the login form.
reqs: REQ-UA-004
verify: grep -q totp src/login.ts
$ specctx task start add-mfa/1.3 | head -12
-- REQ-UA-004 | openspec/changes/add-mfa/specs/user-auth/spec.md:5 | active | requested
### Requirement: REQ-UA-004 Second factor
The system SHALL ask for a TOTP code after a valid password.

#### Scenario: SCN-UA-004-1 Valid code
- **WHEN** the user enters the current TOTP code
- **THEN** the system opens a session

#### Scenario: SCN-UA-004-2 Expired code
- **WHEN** the user enters a code older than 30 seconds
- **THEN** the system rejects it

$ printf '// REQ-UA-004\nexport const prompt = "totp";\n' > src/login.ts
$ specctx task done add-mfa/1.3
index rebuilt
done add-mfa/1.3. Evidence: .ctx/evidence/add-mfa/1.3.json
$ specctx stats --change add-mfa
index rebuilt
change   context_ratio  evidence_ratio  stale_catches  cycle_time_median_s  debt
add-mfa  0.2950 (n=1)   1.00 (1/1)      n/a            6 (n=1)              2
total    0.2950 (n=1)   1.00 (1/1)      n/a            6 (n=1)              13 (0 baselined + 13 new)
gate_runs n/a
gate_pass_rate n/a
gate_failures_caught n/a
context_ratio = bundle chars / chars of all specs. Lower is better.
```

</details>

The demo runs on a copy of `tests/fixtures/no-id-repo` after `specctx adopt`. `bash docs/demo/record.sh` records it again.

## What it does

spec-ctx is a deterministic context engine and task workflow for OpenSpec projects. The CLI is `specctx`.

OpenSpec gives you a proposal, specs, a design, and tasks. spec-ctx adds what an AI agent needs to work on them without reading the whole tree:

- Stable IDs on every requirement, scenario, decision, and task.
- An index that links each ID to code, tests, and other IDs.
- `bundle`: the few kilobytes of spec that one task needs, with the file and line of each block.
- `task next`, `task start`, `task done`: the checkbox changes only after the `Verify:` command of the task exits 0, and the evidence stays beside the tree.
- A generated handoff, so the next session starts with one command.

No LLM call. No daemon. The same files give the same bytes.

## Install

spec-ctx needs Node 22. Run it in a project after `openspec init`.

```bash
npx -y github:sonqh/spec-ctx#4490d188ad48 init --all    # from git, works today
npx spec-ctx init --all                                # from npm, after the 0.1.0 publish
```

The git form builds the package on install with Node only. Pin a commit SHA. A branch name such as `main` also works, but it moves.

The command writes `spec-ctx.toml`, installs the `spec-driven-ids` schema into `openspec/schemas/`, adds its rules to `openspec/config.yaml`, and installs three skills into `.claude/skills/` and `.agents/skills/`.

The examples below use `specctx`. With `npx`, write the `npx` form in its place. After the publish, `npm install -g spec-ctx` puts `specctx` on your path. Each GitHub release also carries a single binary for Linux and macOS.

## Two paths

### Fresh project

```bash
npx -y @fission-ai/openspec@latest init
npx spec-ctx init --all
specctx gate --strict
```

### Existing OpenSpec project

```bash
npx spec-ctx init --all
specctx adopt --dry-run                 # the ID that each header gets. Writes nothing.
specctx adopt                           # writes the IDs into main specs and active deltas
specctx task backfill --manual "adopted"
specctx baseline write
specctx gate --strict
```

- `adopt` gives an ID to every requirement and scenario header without one, in `openspec/specs/` and in the deltas of active changes. A delta header gets the main ID by its text or through its RENAMED line. A delta header that matches neither keeps its text and goes into `adopt-report.md`.
- `adopt` derives a capability code from each folder name, for example `UA` for `user-auth`. It writes the codes into `spec-ctx.toml`. Rename a code there before the IDs spread.
- `adopt` runs `check` before and after the write. A finding that the write added undoes every file. A second run prints `nothing to adopt`.
- `task backfill` writes manual evidence for every ticked task that has none.
- `baseline write` records the debt of the day in `.ctx/baseline.json`: untested requirements and scenarios, tasks without evidence, and legacy tasks without a citation or a Verify code span. `check` hides that debt and prints `baselined: <n>`. New debt still shows.
- Legacy tasks stay in the baseline until an agent adds `[REQ-...]` citations and a `Verify:` code span. `specctx baseline prune` then drops them. No command adds a single entry.

Both paths have an end to end test: `tests/paths/fresh.sh` and `tests/paths/existing.sh`.

## The loop

```bash
specctx status                 # active changes, current task, open questions
specctx task next              # the next open task, its REQ IDs, and its Verify command
specctx task start 001/1.1     # the spec bundle for that task
specctx task done 001/1.1      # run Verify, write evidence, set the checkbox
specctx check --strict         # IDs, links, coverage, and evidence
specctx handoff write          # .ctx/handoff.md for the next session
```

The skills `specctx-bootstrap`, `specctx-next`, and `specctx-done` teach an agent this loop. Install them alone with `npx skills add sonqh/spec-ctx` or `specctx init --skills`.

## Commands

| Command | Use |
| --- | --- |
| `build` | Write `.ctx/index.json`. Every other command rebuilds a stale index first. |
| `status` | Active changes with task counts, the current task, and open questions. |
| `query <term...>` | Entries that hold every term. Flags: `--kind`, `--change`, `--limit`, `--all`. |
| `related <ID>` | Linked entries with the reason for each link. Flags: `--depth`, `--all`. |
| `bundle <ID...>` | Spec text of the IDs, their scenarios, decisions, and neighbors. Flags: `--budget`, `--depth`, `--all`. |
| `check` | ID and link integrity. `--strict` adds test coverage and evidence. |
| `id new`, `id retire` | Allocate and retire IDs. |
| `task next`, `start`, `verify`, `done`, `reopen` | The task state machine. |
| `handoff write`, `ask`, `resolve` | The session handoff and its open questions. |
| `init` | Config file, schema bundle, and skills. Flags: `--schema`, `--skills`, `--all`, `--force`. |
| `adopt` | IDs for a project without them. `--dry-run` writes nothing. |
| `baseline write`, `prune` | The debt ratchet in `.ctx/baseline.json`. |
| `task backfill` | Manual evidence for ticked tasks without it. |
| `gate` | `check`, both markdown linters, `openspec validate`, and the 500 character length check on active deltas. |
| `lint tells`, `lint ste` | The two markdown linters. Flags: `--baseline`, `--disable`, `--json`, `--selftest`. |
| `help <command>` | The page of one command. `specctx <command> --help` prints the same page. |

Every command takes `--root <path>` and `--json`. A task ID takes the change key, such as `008/1.1` or `add-mfa/1.1`, or the full folder name. Outside an OpenSpec project every command but `init` exits 2. Exit codes: 0 for success, 1 for findings or a failed Verify command, 2 for a usage error, 3 for an internal error.

## Config reference

`spec-ctx.toml` sits at the project root. Every key is optional.

```toml
[scan]
specs = ["openspec/specs/**/*.md"]      # main specs
changes = ["openspec/changes/**/*.md"]  # active and archived changes
decisions = ["decisions/*.md"]          # decision records
code = ["src/**"]                       # files with code tags
tests = ["tests/**"]                    # files with Covers tags and scenario IDs
ignore = []                             # globs that the scan skips

[ids]
caps = []                               # capability codes. Empty means any code is valid.
task_pattern = '\d+\.\d+'               # the task number in a tasks.md checkbox

[ids.paths]
UA = "user-auth"                        # capability path of each code. adopt writes the derived ones.

[bundle]
budget = 8000                           # characters
depth = 1

[verify]
timeout_s = 600
```

One environment variable changes the engine:

| Variable | Effect |
| --- | --- |
| `SPECCTX_OPENSPEC` | The command that `gate` runs for `openspec validate`. The default is `npx -y @fission-ai/openspec@latest`. Tests and offline machines set it. |

## Markdown linters

`specctx lint tells` and `specctx lint ste` replace `scripts/tells-lint.py` and `scripts/ste-lint.py` from the ste-humanize skill. They take the same flags and give the same output and exit codes. They need Node only.

```bash
# before
python3 scripts/tells-lint.py --baseline 0 README.md
python3 scripts/ste-lint.py --baseline 0 --disable synonym-rotation README.md
# after
npx spec-ctx lint tells --baseline 0 README.md
npx spec-ctx lint ste --baseline 0 --disable synonym-rotation README.md
```

## GitHub Action

```yaml
- uses: sonqh/spec-ctx@v0
  with:
    version: latest   # npm version, or a git spec such as github:sonqh/spec-ctx#main
    strict: true
```

The action runs `specctx gate`: `check --strict`, both markdown linters, `openspec validate --all --strict`, and the length check.

## Status

- Archived: 001 engine port, 002 IDs and tasks, 004 adopt existing, 005 metrics, 006 polish, 007 README and demo, 008 first run UX.
- Open: 003 distribution. Only the npm publish of `0.1.0` waits.
- Until the publish, install from git with `npx -y github:sonqh/spec-ctx#4490d188ad48`. The npm forms `npx spec-ctx` and `npm install -g spec-ctx` work after it.

## Contribute

`docs/CONTRIBUTING.md` holds the build steps, the layout, the ID scheme, and the gate steps.

## License

MIT.
