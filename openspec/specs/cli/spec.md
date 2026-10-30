# cli Specification

## Purpose
One binary, `specctx`, with short help in Strict STE and stable exit codes.

## Requirements

### Requirement: REQ-CLI-001 Commands and flags
`specctx` SHALL expose `build`, `status`, `next`, `query`, `related`, `bundle`, `check`, `id new`, `id retire`, `task next`, `task start`, `task verify`, `task done`, `task reopen`, `handoff write`, `handoff ask`, `handoff resolve`, `init`, `adopt`, `baseline write`, `baseline prune`, `stats`. Global flags: `--root <path>`, `--json`, `--help`, `--version`. Help SHALL group them under `Read`, `Write`, and `Setup`.

#### Scenario: SCN-CLI-001-1 Version
- **WHEN** `specctx --version` runs
- **THEN** stdout is the version and a newline, exit 0

#### Scenario: SCN-CLI-001-2 Root discovery
- **WHEN** `specctx status` runs from `src/deep/dir` of a project
- **THEN** it uses the project root and prints the same as from the root

#### Scenario: SCN-CLI-001-3 Nothing active
- **WHEN** every change is archived
- **THEN** `status` prints `no active change` and the last archived change, ordered by the `archived` time in each `.openspec.yaml` and then by folder name

#### Scenario: SCN-CLI-001-4 Help groups
- **WHEN** `specctx --help` runs
- **THEN** the output has the headers `Read`, `Write`, and `Setup`

#### Scenario: SCN-CLI-001-5 Adopt commands in Setup
- **WHEN** `specctx --help` runs
- **THEN** `adopt`, `baseline write`, and `baseline prune` appear under `Setup`, and no line names `task backfill`

#### Scenario: SCN-CLI-001-6 Stats under Read
- **WHEN** `specctx --help` runs
- **THEN** `stats` appears under `Read`

#### Scenario: SCN-CLI-001-7 Same day archives
- **WHEN** 005 and 006 were archived on one day and 005 later than 006
- **THEN** `status` prints `last archived: 005-metrics`

#### Scenario: SCN-CLI-001-8 Next under Read
- **WHEN** `specctx --help` runs
- **THEN** `next` appears under `Read` with the flag `--change <name>`, `specctx next --help` prints that page only, and the unknown command list names `next`

### Requirement: REQ-CLI-002 Exit codes and output style
Exit codes: 0 ok, 1 findings or drift, 2 usage or missing input, 3 internal error. Human output SHALL be one line per item, no color when stdout is not a TTY, no emoji. `--json` SHALL print one JSON document on stdout and nothing else. Help text SHALL pass `scripts/ste-lint.py --baseline 0`.

#### Scenario: SCN-CLI-002-1 Unknown command
- **WHEN** `specctx frobnicate` runs
- **THEN** it exits 2 and prints the command list

#### Scenario: SCN-CLI-002-2 JSON only
- **WHEN** `specctx check --json` runs
- **THEN** stdout parses as JSON and stderr is empty

### Requirement: REQ-CLI-003 Fast startup
`specctx --version` SHALL load no module from `src/index/`, `src/graph/`, or `src/check/`. Each command SHALL import its module inside its action.

Refs: ADR-001

#### Scenario: SCN-CLI-003-1 Module list
- **WHEN** the startup test records modules loaded by `--version`
- **THEN** none is under `src/index/`, `src/graph/`, or `src/check/`

### Requirement: REQ-CLI-005 Spec length check in gate
`gate` SHALL add a fourth step after validate. It SHALL read every requirement in the deltas of active changes and report `spec-length: fail <ID> <n> chars` when the text after the header is longer than 500 characters. This is the limit strict validate applies to main specs after archive. The step SHALL exit 1 on any failure.

Refs: REQ-CLI-004

#### Scenario: SCN-CLI-005-1 Long requirement caught
- **WHEN** an active delta has a requirement of 535 characters
- **THEN** `gate --strict` prints `spec-length: fail <ID> 535 chars` and exits 1

#### Scenario: SCN-CLI-005-2 Short requirements pass
- **WHEN** every active delta requirement is at most 500 characters
- **THEN** `gate` prints `spec-length: ok`

### Requirement: REQ-CLI-006 Per command help
`specctx <cmd> --help`, `specctx <cmd> <sub> --help`, and `specctx help <cmd>` SHALL print the page of that command only: usage, one line summary, flags, exit codes, one example. `lint tells --help` and `lint ste --help` SHALL use the same layout. All pages SHALL render from one table that also feeds `specctx --help`. Every page SHALL pass `lint ste --baseline 0`. `help` and `lint` SHALL appear in the unknown command list.

Refs: REQ-CLI-001

#### Scenario: SCN-CLI-006-1 One command
- **WHEN** `specctx task start --help` runs
- **THEN** stdout has the `task start` usage line and no line about `adopt`

#### Scenario: SCN-CLI-006-2 Lint in the same style
- **WHEN** `specctx lint tells --help` and `specctx status --help` run
- **THEN** both pages have the sections `Usage`, `Flags`, `Exit codes`, `Example` in that order

#### Scenario: SCN-CLI-006-3 Unknown command list
- **WHEN** `specctx frobnicate` runs
- **THEN** the printed command list contains `help` and `lint`

### Requirement: REQ-CLI-007 Next steps and project detection
Every command except `init`, `--help`, and `--version` SHALL exit 2 with `not an OpenSpec project (no openspec/ under <root>)` and write nothing when `openspec/` is missing. `status` SHALL end with `next: <command>` from `specctx next`. `task next`, `init`, and `adopt --dry-run` SHALL end with a `next:` line from a fixed table. `init` with every file present and equal SHALL print `nothing to do` and exit 0. `adopt` with no header to change SHALL write no `adopt-report.md`.

Refs: REQ-LOOP-001

#### Scenario: SCN-CLI-007-1 Not a project
- **WHEN** `specctx status` runs in an empty folder
- **THEN** it exits 2, prints the message, and no `.ctx/` folder exists after

#### Scenario: SCN-CLI-007-2 Status next step
- **WHEN** `status` runs and a task is open and no task is current
- **THEN** the last line is `next: specctx task start <t>`, with the same command as `next --json`

#### Scenario: SCN-CLI-007-3 Init twice
- **WHEN** `init --all` runs twice in a row
- **THEN** the second run prints `nothing to do` and exits 0

#### Scenario: SCN-CLI-007-4 Adopt with nothing to do
- **WHEN** `adopt` runs on a project where every header has an ID
- **THEN** it prints `nothing to adopt`, exits 0, and no `adopt-report.md` exists

#### Scenario: SCN-CLI-007-5 Status with no active change
- **WHEN** `status` runs and no folder exists under `openspec/changes/` except `archive`
- **THEN** the last line is `next: <openspec> new change <name>`, with the same command as `next --json`

#### Scenario: SCN-CLI-007-6 Status with every task done
- **WHEN** `status` runs and every task of the active change has `[x]` and evidence
- **THEN** the last line is `next: specctx gate --strict` before a passing gate, and `next: <openspec> archive <c> -y` after one under `[loop] archive = "auto"`. Under `"ask"` it is the archive question of REQ-LOOP-007. Each equals the command of `next --json`

#### Scenario: SCN-CLI-007-7 Status with no command
- **WHEN** `status` runs and the OpenSpec status command exits 1
- **THEN** the last line is `next: none` and `status` exits 0

### Requirement: REQ-CLI-004 gate command
`specctx gate [--strict] [--markdown <globs>]` SHALL run in order: `check` after `build`, `baseline` against the merge base, `lint tells` and `lint ste` on `[gate] markdown` (`--markdown` overrides), `openspec validate --all` with the command in `[gate] openspec`, and the length check. The lint step fails only when a count rises above its baseline line. One `ok`, `skipped`, or `fail` line per step. Stop at the first failure, exit 1. No `python3`.

Refs: REQ-CHK-001, REQ-ADOPT-008

#### Scenario: SCN-CLI-004-1 Clean tree
- **WHEN** `specctx gate --strict` runs on this repository
- **THEN** it prints one `ok` line per step and exits 0

#### Scenario: SCN-CLI-004-2 Stops at first failure
- **WHEN** a spec has a dangling ref
- **THEN** `gate` prints `check: fail`, prints the findings, runs no linter, and exits 1

#### Scenario: SCN-CLI-004-3 No python
- **WHEN** `python3` is not on PATH
- **THEN** `gate --strict` runs both linters and the output has no `skipped` line for them

#### Scenario: SCN-CLI-004-4 Lint summary and cap
- **WHEN** 60 files each gain one new dash and `gate` runs
- **THEN** the lint step prints `linters: fail, 60 new finding(s) in 60 file(s)`, then 50 detail lines of `<file>  <rule>  <current> (baseline <n>)`, then `... 10 more line(s)`, and `--json` lists all 60

#### Scenario: SCN-CLI-004-5 Globs from config
- **WHEN** `spec-ctx.toml` sets `[gate] markdown = ["docs/*.md"]` and `decisions/bad.md` has a semicolon
- **THEN** `gate` prints `linters: ok` for that file set, and `gate --markdown "decisions/*.md"` prints `linters: fail`

#### Scenario: SCN-CLI-004-6 OpenSpec command from config
- **WHEN** `spec-ctx.toml` sets `[gate] openspec = "/bin/false"` and `SPECCTX_OPENSPEC` is not set
- **THEN** `gate` prints `validate: fail` and exits 1, and the same run with `SPECCTX_OPENSPEC=/bin/true` prints `validate: ok` and exits 0

#### Scenario: SCN-CLI-004-7 Step order with the baseline
- **WHEN** `gate` runs on a project with no `.git` and passes
- **THEN** stdout reads `check: ok`, `baseline: skipped (no git repository)`, `linters: ok (...)`, `validate: ok`, `spec-length: ok` in that order, and the gate log line has `steps` equal to `check`, `baseline`, `lint tells`, `lint ste`, `validate`, `spec-length`

### Requirement: REQ-CLI-008 Color on a TTY
Human output SHALL use color only when stdout is a TTY, `NO_COLOR` is unset, and `TERM` is not `dumb`, or when `FORCE_COLOR` is set. Green marks a `done <task>` line. Red marks `Verify failed`, every hard finding of `check`, and `stale-evidence`. Dim marks `next:` lines and the summary line of `check`. Without color the bytes SHALL equal the output of today. `--json` SHALL never carry an escape code.

Refs: REQ-CLI-002

#### Scenario: SCN-CLI-008-1 Pipe stays plain
- **WHEN** `specctx check` runs with stdout in a pipe
- **THEN** the output holds no byte `\x1b`

#### Scenario: SCN-CLI-008-2 Forced color
- **WHEN** `FORCE_COLOR=1 specctx check --strict` runs on a tree with one hard finding
- **THEN** the finding line starts with `\x1b[31m` and the summary line starts with `\x1b[2m`

#### Scenario: SCN-CLI-008-3 NO_COLOR wins
- **WHEN** `NO_COLOR=1 FORCE_COLOR=1 specctx status` runs
- **THEN** the output holds no byte `\x1b`

### Requirement: REQ-CLI-009 Gate rerun mode
`specctx gate --rerun [--base <ref>] [--json]` SHALL run only the rerun step, and the default gate SHALL not run it. It prints one line per closed task, exits 1 on any failure, and exits 0 otherwise. It appends one line with `rerun` in `steps` to `.ctx/gate-log.jsonl` and writes no evidence. When the env holds `SPECCTX_RERUN`, it prints one line and exits 0.

Refs: REQ-CLI-004, REQ-VER-005

#### Scenario: SCN-CLI-009-1 Default gate skips the rerun
- **WHEN** `specctx gate --strict` runs
- **THEN** the gate log line has no `rerun` in `steps`, and the output has no `rerun:` line

#### Scenario: SCN-CLI-009-2 Rerun only
- **WHEN** `specctx gate --rerun` runs and every closed task passes
- **THEN** it prints one `ok` line per task, exits 0, runs no `check` or `validate` step, and the new gate log line has `steps` equal to `rerun`

#### Scenario: SCN-CLI-009-3 Recursion guard
- **WHEN** the env holds `SPECCTX_RERUN=1` and `specctx gate --rerun` runs
- **THEN** it prints one line that names the guard, runs no Verify command, and exits 0

#### Scenario: SCN-CLI-009-4 JSON object
- **WHEN** `specctx gate --rerun --json` runs
- **THEN** it prints one JSON object with the keys `base`, `merge_base`, `ok`, and `tasks`, and each task has `id`, `status`, and `kind`

#### Scenario: SCN-CLI-009-5 No evidence and a usage error
- **WHEN** `gate --rerun` runs, then `gate --rerun extra` runs
- **THEN** the first run leaves `.ctx/evidence/` unchanged, and the second exits 2

### Requirement: REQ-CLI-010 Run prefix
`[cli] run` in `spec-ctx.toml` SHALL name the prefix of every command that spec-ctx prints for a person or agent to run. The default is `specctx`. A value that is not a string with text SHALL exit 2 with `cli.run`. One function SHALL build each printed command. A source test SHALL fail on a bare `specctx <word>` string outside the help text. Help text, skills, and templates keep the bare name.

Refs: REQ-CLI-007, REQ-LOOP-001

#### Scenario: SCN-CLI-010-1 Next uses the prefix
- **WHEN** `spec-ctx.toml` sets `[cli] run = "node dist/cli.js"` and `next` runs with one open task
- **THEN** `next --json` has `command` equal to `node dist/cli.js task start <t>` and the human form ends with `next: node dist/cli.js task start <t>`. The `gate`, `cite`, `repair`, `ask`, and `archive` commands carry the prefix too. So does each part of a joined repair command

#### Scenario: SCN-CLI-010-2 Other prints use the prefix
- **WHEN** the same key holds that value and `status`, `check`, `task start`, `task done`, `adopt --dry-run`, and `init` print a command
- **THEN** these start the command with `node dist/cli.js`. They are the `next:` line of `status`, the hint of each `check` rule, and the cite hint of `task start`. They are also the usage errors that name a command, the `blocked:` line, and the `Next:` lines of `adopt` and `init`

#### Scenario: SCN-CLI-010-3 Default and bad value
- **WHEN** `spec-ctx.toml` has no `[cli]` section, or sets `run = ""` or `run = 5`
- **THEN** the first case prints `specctx` in every command, as before, and each bad value exits 2 with a line that names `cli.run`

#### Scenario: SCN-CLI-010-4 Help keeps the name
- **WHEN** `spec-ctx.toml` sets `[cli] run` and `help task start` runs
- **THEN** the page still names `specctx`, and the golden pages do not change

#### Scenario: SCN-CLI-010-5 New print cannot skip the function
- **WHEN** a source file outside the help text, the lint usage text, and the two report texts holds `specctx ` followed by a word in a string
- **THEN** the source test fails and names the file and line
