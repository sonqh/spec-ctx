# Changelog

This file lists the notable changes in each release of `spec-ctx`. Versions follow semver.

## 0.3.0

### Added

- `check` gets the rule `weak-verify`. It fires on a task line of an active change whose Verify command is only `true`, `:`, `exit 0`, or one `echo` with no `;`, `&`, or `|`. Whitespace around the command does not matter. Plain `check` prints `warning: weak-verify <task> <file>:<line>` and keeps exit 0. `check --strict` and `gate --strict` report a hard finding. The hint reads `Name a test file or a command whose exit code proves the task.` `baseline write` records it like `task-without-verify`. `specctx next` returns `cite` for it before the task starts. REQ-CHK-005, REQ-LOOP-004, REQ-ADOPT-005.
- `handoff ask --change <c>` records the stage of the change in a new `stage` field of the question. The value is `archive` when every task of the change is `[x]`, and `plan` otherwise. At the archive stop under `[loop] archive = "ask"`, `specctx next` returns the command `specctx handoff ask --change <c> "archive <c>?"`. After `handoff resolve`, `next` returns `archive` with `human: false` and the reason `archive approved in question <n>`. An approval lapses when a task of the change closes again after it. REQ-LOOP-007, REQ-CLI-007.
- `specctx next` returns `repair` for the earliest done task of the change whose evidence went stale. The rule runs after the current task closes. The command is `specctx task reopen <t> "stale evidence: <file>" && specctx task done <t>`. The state is `evidence_stale`. REQ-LOOP-008.
- `init --schema` reads `[ids] brackets` from `spec-ctx.toml`. With `true`, the installed templates show `[REQ-<CAP>-NNN]` and `[SCN-<CAP>-NNN-N]` in the requirement and scenario headers, and the merged `rules.specs` items show the bracketed header examples. Task citations, `Refs:` lines, code tags, and `Covers:` tags stay bare. With `false`, every byte stays as before. A rerun after a flip rewrites each template and each rule item that still holds the other form. The output reads `merged openspec/config.yaml rules (<n> replaced)`. An edited template stays without `--force`. The new path test `tests/paths/fresh-brackets.sh` runs in `ci:local` and CI. REQ-SCH-006, REQ-SCH-007.
- `handoff ask --change <c> "<text>"` gives the question to the active change `<c>`. The key or the full folder name works. An unknown change exits 2. `specctx next` then returns `ask` with `human: true` for that change until `handoff resolve` runs. The plan stop of `specctx-run` now holds in the engine. REQ-LOOP-005.

### Changed

- The `fix` reason of `specctx next` names the last line of the Verify tail that starts with `fail:` or `FAIL`. With no such line it names the last non-empty line. It used to name the first line. REQ-LOOP-006.
- `specctx-run` takes the change name of `plan` from the request in kebab case. It reads requirements with `specctx bundle` or `specctx query`, never `openspec show`. The plan stop runs `specctx handoff ask --change <c>`. `archive` runs the steps under `operations.archive.guidance`, then the command in the `command` field. It no longer names `openspec-archive-change`. The skill names `npx -y @fission-ai/openspec@latest` when `[gate] openspec` is absent. REQ-SKL-001, REQ-SKL-003.
- `stats` debt also counts `task-without-verify` and `weak-verify`, in the total and in each change row. REQ-STAT-004.
- ADR-002 lists the capability code `LOOP` with the path `loop`.
- `status` always ends with one line `next: <command>`. The command is the `command` field of `specctx next`, so the two commands never disagree. A decision with no command prints `next: none`. That covers no active change, every task done, and a failed OpenSpec command. With an active change `status` now runs the OpenSpec status command once, like `next`. REQ-CLI-007.
- The `stale-evidence` hint reads `Run specctx task reopen <task> <why>, then specctx task done <task>.` A check finding can carry its own hint. The `retitle-needs-renamed` hint now prints the RENAMED block with the main header as `FROM` and the delta header as `TO`. Each keeps the bare or bracketed form of its file. The other rules and `check --json` keep their output. REQ-CHK-006.
- `specctx-run` runs `specctx gate --strict` at the plan step, so the spec-length check runs before the plan stop. It names `specctx id new --count <n>`. At the archive stop it runs `specctx handoff ask --change <c> "archive <c>?"`. After the approval it runs the archive steps. `repair` runs the command in the `command` field. REQ-SKL-004.
- `operations.archive.guidance` in `openspec/config.yaml` of this repository lists every step that runs before an archive: `stats --write`, the README `## Measured` total row, the README `Archived:` line, `## Unreleased` in `CHANGELOG.md`, `docs/verification/<NNN>.md`, and `bun run ci:local`. The `specctx-run` skill runs them. REQ-GOV-009.

## 0.2.0

### Added

- `specctx next [--json] [--change <c>]`. One read command names the next action of the loop from the files on disk. The `action` is one of `plan`, `cite`, `start`, `work`, `fix`, `repair`, `gate`, `archive`, `ask`, `stop`. The object has nine sorted keys: `action`, `attempt`, `change`, `command`, `human`, `max_attempts`, `reason`, `state`, `task`. The human form prints `action:` first and ends with `next: <command>`. Planning state comes from `<openspec> status --change <c> --json`, with the command from `[gate] openspec` or `SPECCTX_OPENSPEC`. ADR-006 item 2.
- `task done` on a failed Verify writes `.ctx/evidence/<c>/<t>.fail-<n>.json` with `at`, `attempt`, `stderr_tail`, `task`, `verify`. The attempt counts the fail files since `task start`, and a resolved question for the task resets it. At `[loop] max_attempts` it appends a question to `.ctx/questions.json` and prints `blocked: question <k> written. Run specctx handoff resolve <k> "<answer>" to continue.` `check`, `stats`, and `handoff` skip fail files. ADR-006 item 4.
- The scan reads a requirement or scenario ID in square brackets too: `### Requirement: [REQ-UA-001] Session timeout`. That is the form of upstream OpenSpec PR #1979. Both forms give the same ID and title, and a delta in one form matches a main entry in the other. A bracket without a spec-ctx ID, such as `[AUTH-3]`, still gives `missing-id`. REQ-IDX-006.
- `spec-ctx.toml` gets `[ids] brackets`, a boolean with the default false. When it is true, `adopt` and `id new REQ` or `id new SCN` write the bracketed form. `adopt` never rewrites a header that has an ID in either form. `id new --for` accepts both forms. `init` writes the key with a comment. REQ-ADOPT-010, REQ-IDS-004.
- `retitle-needs-renamed` reads bracketed RENAMED lines. Its hint says to write each ID as its header writes it.
- `spec-ctx.toml` gets `[loop] max_attempts` (an integer of 1 or more, default 3) and `[loop] archive` (`"ask"` or `"auto"`, default `"ask"`). `init` writes both with comments.

### Changed

- `spec-ctx.toml` gets `[gate] openspec`, the command that `gate` runs for `openspec validate`. The default is `npx -y @fission-ai/openspec@latest`. Set it to `openspec` for a global install or a fork of OpenSpec. The env var `SPECCTX_OPENSPEC` still overrides it for one run. `init` writes the key with a comment.
- `init --schema` and `init --all` print one `templates:` line before `next:`. It names `openspec/templates/spec-driven-ids/` and the two files that hold the ID placeholders.
- The README fresh path shows `openspec init --tools <tool>`, so the command runs without a prompt, and names `--no-animation` for clean logs. The existing path names `[gate] openspec`.
- `task done <t> --manual` exits 2 when the task line has a Verify code span. The message names `specctx task done <t>`. A manual note stays allowed only for a task with no Verify command.
- `task done <t>` on a `[x]` task with no evidence file runs the Verify command. Exit 0 writes the evidence and keeps the box. A failure leaves the box as it is, so `check --strict` keeps its `done-without-evidence` finding. The exit 2 with `task <t> is done` stays only when evidence exists.
- `task start` writes `verify` into `.ctx/current.json`. `task done <t>` exits 2 when the Verify command on the task line differs from that value, and names `specctx task start <t>` as the fix.

- `gate` gets a `baseline` step after `check`. It reads `.ctx/baseline.json` at the merge base of `HEAD` and `[gate] base` (default `origin/main`) and fails on a new entry or a risen lint count with `baseline: fail, <n> new entr(y|ies)`. A commit whose subject starts with `baseline:` passes the step. Without git, a merge base, or the file at the merge base the step prints `baseline: skipped (<reason>)`. The env var `SPECCTX_BASELINE_SUBJECT` replaces the subject for tests. The `specs` job of this repository checks out with `fetch-depth: 0`.
- `check` gets the hard rule `retitle-needs-renamed`. It fires on a MODIFIED or REMOVED header of an active change whose ID exists in main with another title. The delta must lack a RENAMED pair whose TO line carries the new header. The finding line reads `<file>:<line>  retitle-needs-renamed  <ID>  "<old>" -> "<new>"`, and `--json` adds a `detail` field. The hint prints the RENAMED block to paste. Upstream OpenSpec matches delta headers by text and refuses such a header at archive. ADR-006 item 7.
- `check` reads the first ID of a row in `decisions/retired-ids.md` as the retired one, also when that ID is a scenario. Before, a retired scenario row whose reason named an ADR made that ADR a `reused-id` finding.

- One skill, `specctx-run`. It runs `specctx next --json`, acts on the action, runs `specctx handoff write`, and repeats until `stop` or a human stop. It names the exact commands for `plan`, `cite`, `start`, `work`, `fix`, `repair`, `gate`, `archive`, `ask`, and `stop`. It calls the upstream `openspec-propose` and `openspec-archive-change` skills by name and never `/opsx:apply`. `specctx-bootstrap`, `specctx-next`, and `specctx-done` are six line aliases for one release. `init --skills` installs all four folders. ADR-006 item 3.
- `init --schema` installs only the four templates with ID placeholders, into `openspec/templates/spec-driven-ids/`, and merges the config fragment. It no longer installs a schema folder and no longer writes `schema: spec-driven-ids`. The project keeps the stock `spec-driven` schema. A config that still says `schema: spec-driven-ids` gets a note and keeps its line. The `apply` guidance now says: close each task only with `specctx task done <id>`, never edit a checkbox, never run `/opsx:apply`, run the `specctx-run` skill. A new rule names the templates path. ADR-006 item 8.
- `openspec/config.yaml` of this repository says `schema: spec-driven`, so upstream `openspec status` and `openspec instructions` resolve the schema again.

### Removed

- `schemas/spec-driven-ids/schema.yaml`, the 301 line copy of the upstream `spec-driven` schema. REQ-SCH-001 is removed. The text `mark complete as you go` is gone with it.
- `task backfill` and REQ-TASK-006. The baseline rule `done-without-evidence` records every ticked task without evidence, so `baseline write` covers legacy tasks on day one. ADR-006 item 11.
- The default of `[gate] markdown` is `[]`. A project without the key lints no markdown in `gate`. `init` writes `markdown = []` with a comment that names the globs to set. This repository passes `--markdown` in CI.
- `init` pins OpenSpec. It runs `npx -y @fission-ai/openspec@latest --version` once and writes `openspec = "npx -y @fission-ai/openspec@<version>"`. When the command fails or takes over 60 seconds, it writes `@latest` and prints `note: could not read the OpenSpec version. [gate] openspec uses @latest.` The env var `SPECCTX_OPENSPEC` at init time is written as it is.
- `init --schema` merges the `rules` and `operations` items of the fragment into an existing key, item by item. An item that exists is not added twice. The output line is `merged openspec/config.yaml rules (<n> added)`.
- `init` writes four `.gitignore` lines: `.ctx/index.json`, `adopt-report.md`, `.ctx/current.json`, `.ctx/gate-log.jsonl`.
- Open questions live in `.ctx/questions.json`, a sorted JSON list of `{n, asked_at, task, text, status, answer?, resolved_at?}`. `handoff ask` appends and prints the `n`. `handoff resolve <n> <answer>` resolves question `n`. `handoff write` and `status` read the file. `handoff.md` renders each question as `Q<n> <text> (task <task>, <date>)` and shows the last 10 resolved entries with one line `and <n> more in .ctx/questions.json`. The first `handoff write` on an old `handoff.md` migrates its questions once and prints `migrated <n> question(s) to .ctx/questions.json`.
- The path tests run on upstream `@fission-ai/openspec@latest` with no fork. `tests/paths/fresh.sh` creates a change with `openspec new change`, writes the artifacts from the templates, closes both tasks, and ends with `gate --strict` exit 0 with no config edit after `init --all`. `tests/paths/rules-only.sh` shows that the `rules` of `openspec/config.yaml` reach the instructions of the stock `spec-driven` schema.
- `docs/getting-started.md` walks the fresh path on upstream OpenSpec for a developer who knows OpenSpec. The README links it. The README existing path reads `init --all`, `adopt --dry-run`, `adopt`, `baseline write`, `gate --strict`.

## 0.1.2

### Changed

- `init` never replaces `spec-ctx.toml` and never exits 2 because a file exists. Without `--force`, it keeps each file with other content and lists it as `kept <file> (other content)`. The `next:` line then names the same command with `--force`.
- `init --schema` repairs the config of a project that already has `spec-ctx.toml`. It needs no `--force`.
- `check` reports no `missing-id` for a header inside an archived change. `adopt` never writes IDs there.
- `baseline write` also records the `missing-id` findings of active changes, as `missing-id <file> <title>`. The existing path then ends with `gate --strict` exit 0 on a project with archived changes or a delta header that matches no main requirement. Found on a fork of OpenSpec, see `docs/dogfood/openspec.md`.
- `task start` prints one hint line when the task cites no REQ. It names `specctx query --change <change> --kind req` and the citation to add.
- `query --kind` accepts the kind in any case. `--kind REQ` and `--kind req` return the same entries.
- `baseline write` records the hard lint findings per file and rule as `lint <file> <rule> <count>`. `gate` fails the lint step only when a count rises above its line. It prints one summary line and cuts the detail at 50 lines (`--json` keeps every line). `baseline prune` lowers and drops the lines. `spec-ctx.toml` gets `[gate] markdown`, the globs the gate lints. `--markdown` still overrides it.
- `task backfill` writes evidence only for ticked tasks of active changes. Archived changes stay untouched. On a fork of OpenSpec it wrote 1,351 files for the archive before.
- `init` adds `.ctx/index.json` and `adopt-report.md` to `.gitignore` under a `# spec-ctx` comment when they are absent, and creates the file when it is missing. It prints `wrote .gitignore (2 lines)` or `kept .gitignore`. When `.gitignore` ignores `.claude/` and `init` writes skills there, it prints one note that names the tracked copies under `.agents/skills/`.
- `init` writes `tests = ["test/**"]` when `test/` exists and `tests/` does not, and `code = ["lib/**"]` when `lib/` exists and `src/` does not.
- `adopt --dry-run` ends with `exit 1: <n> headers need an ID. Next: specctx adopt`. The exit code stays 1.
- `query --change <name>` with no term lists every canonical entry of that change. `--kind` still filters. Without `--change`, no term stays a usage error. The hint of `task start` names this call.

## 0.1.1

### Added

- `--help` on every command prints help for that command.
- `check` prints a summary with a hint for each kind of finding.
- The engine detects the project root and its OpenSpec layout.
- Commands end with a `next:` line that names the next step.
- Output has color on a TTY. Set `NO_COLOR` to turn it off.
- `task start` ends with a footer that gives the bundle size.
- `gate` writes its own log.
- `init --schema` repairs config items that YAML reads as mappings. The repair quotes each `rules` and `operations` item.
- The `spec-driven-ids` schema has a README with a copy install path.

### Changed

- A change folder with a kebab-case name, such as `013-schema-catalog`, gets a change key.
- `caps` can be empty.
- When Verify fails, `task done` prints `Verify failed (exit n). The task stays open.`
- The lint rules match the ste-humanize oracle at commit 60bc25a.

## 0.1.0

First release on npm.
