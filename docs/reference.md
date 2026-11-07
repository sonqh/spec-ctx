# spec-ctx reference

The README tells the story. This page holds the details: install, the two paths, every command, the config file, the linters, and the GitHub Action.

The examples use `specctx`. With `npx`, write `npx -y spec-ctx` in its place.

## Install

spec-ctx needs Node 22. Run it in a project after `openspec init`.

```bash
npx -y spec-ctx init --all                           # from npm
npm install -g spec-ctx                              # puts specctx on your path
npx -y github:sonqh/spec-ctx#<sha> init --all        # from git, for an unreleased commit
```

The git form builds the package on install with Node only. Pin a commit SHA. A branch name such as `main` also works, but it moves. Each GitHub release also carries a single binary for Linux and macOS.

Install the skill alone with `npx skills add sonqh/spec-ctx` or `specctx init --skills`.

`init --all` does these things:

- It writes `spec-ctx.toml`.
- It copies the templates with ID placeholders to `openspec/templates/spec-driven-ids/`. The project keeps the stock `schema: spec-driven`.
- It adds the spec-ctx `rules` and `operations` to `openspec/config.yaml`. Upstream OpenSpec injects the rules into every artifact instruction.
- It installs the `specctx-run` skill and its three aliases into `.claude/skills/` and `.agents/skills/`.
- It pins the OpenSpec version it finds in `[gate] openspec`.
- It adds four lines to `.gitignore`: `.ctx/index.json`, `adopt-report.md`, `.ctx/current.json`, and `.ctx/gate-log.jsonl`. The rest of `.ctx/` is meant for git, `questions.json` included.

## Two paths

[`docs/getting-started.md`](https://github.com/sonqh/spec-ctx/blob/main/docs/getting-started.md) walks the fresh path on upstream OpenSpec with real output.

### Fresh project

```bash
npx -y @fission-ai/openspec@latest init --tools <tool>
npx spec-ctx init --all
specctx gate --strict
```

`--tools <tool>` names your agent, such as `claude`, and skips the interactive picker. `--no-animation` keeps logs clean. `init --all` merges the ID rules into an existing `rules` key of `openspec/config.yaml` item by item and prints `merged openspec/config.yaml rules (<n> added)`.

### Existing OpenSpec project

```bash
npx spec-ctx init --all                 # prints `next: specctx adopt` when headers need an ID
specctx adopt                           # writes the IDs into main specs and active deltas
specctx context <task>                  # the specs, code, and tests that the task needs
```

`adopt --dry-run` shows the ID that each header gets and writes nothing. `adopt` ends with the `context` command for the next open task.

Then, to gate the old debt, record it and run the gate. Commit the baseline with a subject that starts with `baseline:`.

```bash
specctx baseline write
specctx gate --strict
```

- `adopt` gives an ID to every requirement and scenario header without one, in `openspec/specs/` and in the deltas of active changes. A delta header gets the main ID by its text or through its RENAMED line. A delta header that matches neither keeps its text and goes into `adopt-report.md`.
- `adopt` derives a capability code from each folder name, for example `UA` for `user-auth`. It writes the codes into `spec-ctx.toml`. Rename a code there before the IDs spread.
- `adopt` runs `check` before and after the write. A finding that the write added undoes every file. A second run prints `nothing to adopt`.
- `baseline write` records the debt of the day in `.ctx/baseline.json`. The debt has five kinds. Ticked tasks without evidence. Legacy tasks without a citation or a Verify code span. Delta headers that match no main requirement. Hard lint findings per file and rule on the gate globs. `check` hides that debt and prints `baselined: <n>`. `gate` fails the lint step only when a count rises. New debt still shows.
- `gate` compares `.ctx/baseline.json` with the copy at the merge base of `HEAD` and `[gate] base`, default `origin/main`. A new entry fails the `baseline` step. Commit a grown baseline with a subject that starts with `baseline:` to pass once. In CI, check out with `fetch-depth: 0`, so the merge base exists. Without git or a merge base the step prints `skipped`.
- `[gate] markdown` in `spec-ctx.toml` names the markdown globs that `gate` lints. `init` writes `[]`, so the gate lints nothing until you opt in.
- Legacy tasks stay in the baseline until an agent adds `[REQ-...]` citations and a `Verify:` code span. `specctx baseline prune` then drops them. No command adds a single entry.

Both paths have an end to end test on upstream OpenSpec: `tests/paths/fresh.sh` and `tests/paths/existing.sh`. `tests/paths/rules-only.sh` shows that the merged `rules` reach the stock `spec-driven` schema.

## Ask for the context

`specctx context <task|ID|path|change>` takes one input and prints the spec text that relates to it, with one provenance line for each block.

- A task gets the requirements it cites and the code and test lines that tag them. It also gets the decisions that name them, and the deltas and designs of its change. `task start` prints this same answer.
- A file gets the requirements it tags and the code and test lines of those requirements, so its own tests appear.

This is the output for task `045/2.1` of this repository, with the text of each block left out:

```text
$ specctx context 045/2.1
-- 045/2.1 | openspec/changes/archive/2026-10-30-045-query-by-file/tasks.md:11 | done | requested | declared | fresh
-- 045/D2 | openspec/changes/archive/2026-10-30-045-query-by-file/design.md:22 | archived | design named in 045/2.1 | structural
-- 045/D3 | openspec/changes/archive/2026-10-30-045-query-by-file/design.md:23 | archived | design named in 045/2.1 | structural
-- REQ-IDX-008 | openspec/specs/index/spec.md:137 | active | delta in change of 045/2.1 | structural | verified
-- REQ-IDX-009 | openspec/specs/index/spec.md:150 | active | delta in change of 045/2.1 | structural | verified
-- REQ-QRY-005 | openspec/specs/query/spec.md:76 | active | delta in change of 045/2.1 | structural | verified
-- REQ-QRY-006 | openspec/specs/query/spec.md:93 | active | ref from 045/2.1 | declared | verified
-- REQ-QRY-008 | openspec/specs/query/spec.md:106 | active | delta in change of 045/2.1 | structural | verified
-- src/graph/files.ts:1 | src/graph/files.ts:1 | active | implements REQ-QRY-006 | verified
-- tests/query/file-edges.test.ts:1 | tests/query/file-edges.test.ts:1 | active | covers REQ-QRY-006 | verified
-- src/graph/related.ts | src/graph/related.ts | active | named by 045/2.1 | declared
-- tests/query/bundle.test.ts | tests/query/bundle.test.ts | active | named by 045/2.1 | declared
-- tests/query/related.test.ts | tests/query/related.test.ts | active | named by 045/2.1 | declared
```

### The budget

`bundle` gives the same answer for one input. It also takes several inputs, `--block`, and `--all`. Every entry has a card, which is its provenance line. The card ends with trust labels: the provenance of the link (`declared`, `tagged`, `structural`, `verified`) and, for a task or a requirement, its evidence state (`fresh`, `stale since <path>`, `no evidence`, `verified`, `unverified`). `--json` lists the printed blocks with both labels and gives `used`, the length of the blocks. When the text passes the budget, the output fills in five steps. Each step runs in print order.

1. The cards of the requirements that a task cites.
2. The code and test cards.
3. The bodies of those requirements.
4. The cards of the specs, the decisions, the tasks, and the changes.
5. The bodies of those entries.

Then the archived decisions and the entries two steps away print whole or not at all.

A card whose body did not fit ends with `| body omitted`. Run `bundle <ID>` to get that body. The cards of a repeat line of one file and the `named by` cards fill after the bodies of cited requirements. They can go to `truncated:`. The `truncated:` line names only the entries that lost their card, and is not in the budget. The input itself never drops. Its block prints also when it is longer than the budget, and then the output ends with `over budget: <used> of <budget> characters`.

For a task, `bundle` also prints one card for each file that the task line names in backticks. The reason is `named by <task>`. These cards print after the `implements` and `covers` lines. A path that is no file, or that already has a line, prints no card. A task that cites no requirement that the index holds gets one line after its block: `note: <task> cites no requirement that the index holds. The blocks come from its change and the paths it names. Add a [REQ-...] citation.` The note is outside the budget.

Do not take the output as a full answer when the `truncated:` line or a marker is there. With `--json`, the fields `omitted`, `body_omitted`, `chars`, `budget`, and `complete` give the same facts. `omitted` lists the entries with no card. `body_omitted` lists the entries with the marker. `complete` is true when both lists are empty.

### Ask about a file

`related`, `context`, and `bundle` take a file path where they take an ID. The reason on each line tells you how strong the link is.

- `implements` comes from a code tag.
- `covers` comes from a `Covers:` tag.
- `mentions` comes from a path in backticks in a task line of an active change.

```text
$ specctx related src/util/hash.ts
adr  ADR-004  active  decisions/ADR-004-tasks-md-is-the-view-evidence-is-the-record.md:1  ref from REQ-TASK-004
req  REQ-CHK-003  active  openspec/specs/check/spec.md:64  ref to REQ-TASK-004
req  REQ-STAT-002  active  openspec/specs/metrics/spec.md:19  ref to REQ-TASK-004
req  REQ-TASK-004  active  openspec/specs/task-workflow/spec.md:89  implements, tag at src/util/hash.ts:1
req  REQ-VER-004  active  openspec/specs/verify-runner/spec.md:37  ref to REQ-TASK-004
scn  SCN-TASK-004-1  active  openspec/specs/task-workflow/spec.md:94  scenario of REQ-TASK-004
task  002/3.3  done  openspec/changes/archive/2026-10-24-002-ids-and-tasks/tasks.md:17  task cites REQ-TASK-004
```

A path that is not a file in the repository exits 2. A file with no links prints `no links: <path>` and exits 0.

### Ask about a change or a task

`related`, `context`, and `bundle` take a change key or a folder name where they take an ID. A change reaches the requirements and scenarios of its delta specs and the capabilities they touch. For example, `specctx related 045` lists the 5 requirements and 13 scenarios of change 045, then `cap/index` and `cap/query`.

A task reaches the same delta entries and the design decisions that its line names, for example `specctx related 045/2.1`. A requirement reaches its capability, and `related cap/query` lists the requirements of one capability. A modified requirement shows its main version beside the delta. The index stores only the `change` and `cap` entries and the design links of tasks. The other edges come from the folder structure when you ask. `query` hides the `change` and `cap` entries unless you pass `--kind change` or `--kind cap`.

## Commands

| Command | Use |
| --- | --- |
| `build` | Write `.ctx/index.json`. Every other command rebuilds a stale index first. |
| `status` | Active changes with task counts, the current task, and open questions. |
| `next` | The next action of the loop from the files on disk: `plan`, `cite`, `start`, `work`, `fix`, `repair`, `gate`, `archive`, `ask`, or `stop`. `--json` prints one object. Flag: `--change`. |
| `query <term...>` | Entries that hold every term. Flags: `--kind`, `--change`, `--limit`, `--all`. |
| `context <task\|ID\|path\|change>` | The spec text, code lines, and test lines that relate to one input, in a budget. `task start` prints the same answer. Flags: `--budget`, `--depth`. |
| `related <ID\|path\|change>` | Linked entries with the reason for each link. A file path or a change works too. Flags: `--depth`, `--all`. |
| `bundle <ID\|path\|change...>` | The answer of `context` for several inputs. Flags: `--budget`, `--depth`, `--all`, `--block`. |
| `check` | ID and link integrity. `--strict` adds test coverage and evidence. For an active change, the coverage rules start when the change has a task and no open task. While a task is open, or when the change has no task, `--strict` prints `deferred: <change>  <n> untested delta items, <k> open tasks` for the delta items that have no test yet. A count of 1 is singular. `--strict --json` holds the same in a `deferred` array. A clean result with a `deferred:` line does not show that the tests are complete. A change with no task shows `0 open tasks`. `retitle-needs-renamed` names a retitled delta header that needs a RENAMED pair before `openspec archive`. |
| `id new`, `id retire` | Allocate and retire IDs. |
| `task next`, `start`, `verify`, `done`, `reopen` | The task state machine. |
| `handoff write`, `ask`, `resolve` | The session handoff and its open questions in `.ctx/questions.json`. A plan or archive question needs `--approve` or `--reject`, and a rejection keeps the stop. |
| `init` | Config file, ID templates and rules, and skills. Flags: `--schema`, `--skills`, `--all`, `--force`. |
| `adopt` | IDs for a project without them. `--dry-run` writes nothing. |
| `baseline write`, `prune` | The debt ratchet in `.ctx/baseline.json`. |
| `gate` | `check`, the baseline against the merge base, both markdown linters, `openspec validate`, and the 500 character length check on active deltas. |
| `lint tells`, `lint ste` | The two markdown linters. Flags: `--baseline`, `--disable`, `--json`, `--selftest`. |
| `stats` | The metrics of this repository. `--write` saves them to `docs/metrics/`. |
| `help <command>` | The page of one command. `specctx <command> --help` prints the same page. |

Every command takes `--root <path>` and `--json`. A task ID takes the change key, such as `008/1.1` or `add-mfa/1.1`, or the full folder name. Outside an OpenSpec project every command but `init` exits 2.

Exit codes:

- 0 for success.
- 1 for findings or a failed Verify command.
- 2 for a usage error.
- 3 for an internal error.

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
brackets = false                        # true: adopt, id new, and init --schema write [REQ-UA-001] in headers. The scan reads both forms.

[ids.paths]
UA = "user-auth"                        # capability path of each code. adopt writes the derived ones.

[bundle]
budget = 8000                           # characters
depth = 1

[verify]
timeout_s = 600

[gate]
markdown = []                           # globs that gate lints. Empty means no lint. This repo opts in.
openspec = "npx -y @fission-ai/openspec@1.15.0"  # the command that runs OpenSpec. init pins the version it found.
base = "origin/main"  # the ref whose merge base holds the baseline that gate compares with

[loop]
max_attempts = 3                        # Verify failures on one task before task done writes a question
archive = "ask"                         # "ask" stops before archive for a human. "auto" lets the loop archive.

[cli]
run = "specctx"                         # the prefix of every command that spec-ctx prints. init writes npx -y spec-ctx@<version> under npx.
```

The change name is the first folder under the fixed prefix of the `changes` glob. The fixed prefix is the literal path before the first wildcard. With `work/changes/**/*.md`, the file `work/changes/a/tasks.md` belongs to the change `a`. Under an `archive/` folder, the change is the next folder without its date. A file directly under the prefix has the change `main`. With several globs, the first glob that matches the path and yields a folder wins. `check`, `next`, and `gate --rerun` still read `openspec/changes`.

With `brackets = true`, `init --schema` installs templates with `[REQ-<CAP>-NNN]` and `[SCN-<CAP>-NNN-N]` in the headers. The merged rules show the same form. Task citations, `Refs:` lines, and tags stay bare. After you change the value, run `specctx init --schema` again. It switches each template and rule that you did not edit. It keeps the ones you edited, unless you add `--force`.

Two environment variables change the engine:

| Variable | Effect |
| --- | --- |
| `SPECCTX_OPENSPEC` | The command that `gate` runs for `openspec validate` and `next` runs for `openspec status`. It overrides `[gate] openspec` for one run. `init` writes it into the file as it is, and no version detection runs. Tests and offline machines set it. |
| `SPECCTX_BASELINE_SUBJECT` | The commit subject that the `baseline` step of `gate` tests for `baseline:`. It replaces the subject of `HEAD`. Tests set it. |

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

## GitHub Action rerun

```yaml
on: pull_request
permissions:
  contents: read
jobs:
  rerun:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: sonqh/spec-ctx@v0
        with:
          rerun: true
          base: origin/${{ github.base_ref }}
```

With `rerun: true` the action runs `specctx gate --rerun` and no other step. It runs the Verify command of each task that the pull request closed and compares the exit code with the evidence. `base` is the ref for the merge base. Without `rerun`, the action ignores `base`.

- On `push`, the default base gives a merge base equal to HEAD, so the rerun compares nothing. It prints one line and passes. Pass `base: ${{ github.event.before }}` on push.
- A push that creates a branch gives forty zeros. The rerun prints `rerun: base is the zero commit (a new branch), nothing to compare` and passes.
- After a force push the old commit may be missing from the clone. The rerun then prints `rerun: base <ref> is not in this clone. Fetch it or use fetch-depth: 0` and exits 1.

The security boundary is in the README, section GitHub Action.
