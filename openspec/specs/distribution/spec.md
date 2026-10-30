# distribution Specification

## Purpose
How spec-ctx is configured, built, and run on a user's machine.

## Requirements

### Requirement: REQ-DIST-001 Runtime compatibility
The published package SHALL run on Node 22 with `node dist/cli.js` and no build step. Source SHALL use only APIs that Node 22 provides. CI SHALL run the test suite on Bun and on Node 22. `bun build --compile` SHALL produce a working single binary.

Refs: ADR-001

#### Scenario: SCN-DIST-001-1 Node run
- **WHEN** `node dist/cli.js --version` runs after `bun run build`
- **THEN** it prints the version and exits 0

#### Scenario: SCN-DIST-001-2 No Bun global
- **WHEN** the source is searched for `Bun.`
- **THEN** there are no matches outside `scripts/`

### Requirement: REQ-DIST-002 Config file and init
`spec-ctx.toml` SHALL hold `scan`, `ids`, `bundle`, `verify`, `gate.markdown`, `gate.openspec`, `loop` (REQ-LOOP-003). Absent keys default. `init` SHALL write a commented default, `test/**` or `lib/**` if only that dir exists, the detected OpenSpec version, and its four `.gitignore` lines if absent. `--schema` adds the schema, `--skills` the skills, `--all` both. It keeps `spec-ctx.toml`. Without `--force` it keeps and lists changed files.

Refs: ADR-001, ADR-006, REQ-SCH-003, REQ-SKL-002

#### Scenario: SCN-DIST-002-1 Defaults
- **WHEN** no `spec-ctx.toml` exists
- **THEN** `build` scans the default paths

#### Scenario: SCN-DIST-002-2 Init
- **WHEN** `specctx init` runs in an empty project
- **THEN** `spec-ctx.toml` exists with a comment above every key

#### Scenario: SCN-DIST-002-3 Init all
- **WHEN** `specctx init --all` runs on a fresh `openspec init` project
- **THEN** the config, the schema, and the skills exist and `specctx status` exits 0

#### Scenario: SCN-DIST-002-4 Existing files stay
- **WHEN** `spec-ctx.toml` and one skill file exist with other content and `init --all` runs without `--force`
- **THEN** it exits 0, both files keep their bytes, the output lists both as kept, the missing files exist, and the `next:` line names `--force`

#### Scenario: SCN-DIST-002-5 Gate globs
- **WHEN** `spec-ctx.toml` sets `[gate] markdown = ["docs/*.md"]`
- **THEN** `gate` lints only the files under `docs/`, and a project without the key lints no file. `init` writes `markdown = []` with a comment that says how to turn the lint on

#### Scenario: SCN-DIST-002-6 Gitignore lines
- **WHEN** `init` runs in a project whose `.gitignore` lacks `.ctx/index.json`, `adopt-report.md`, `.ctx/current.json`, and `.ctx/gate-log.jsonl`, or has no `.gitignore`
- **THEN** the file ends with a `# spec-ctx` comment and the four lines, the output has `wrote .gitignore (4 lines)`, and a second run prints `kept .gitignore` and leaves the file byte-identical

#### Scenario: SCN-DIST-002-7 Ignored skills dir
- **WHEN** `.gitignore` has a line `.claude/` and `init --skills` writes the skills
- **THEN** the output has one line `note: .gitignore ignores .claude/. The skills under .claude/skills/ stay out of git. The copies under .agents/skills/ are tracked.`

#### Scenario: SCN-DIST-002-8 Test and code dirs
- **WHEN** `init` runs in a project with `test/` and `lib/` at the root and no `tests/` or `src/`
- **THEN** `spec-ctx.toml` has `tests = ["test/**"]` and `code = ["lib/**"]`, each with its comment above, and a project with `tests/` and `src/` gets `tests/**` and `src/**`

#### Scenario: SCN-DIST-002-9 OpenSpec command
- **WHEN** `spec-ctx.toml` has no `[gate] openspec` key
- **THEN** the key reads `npx -y @fission-ai/openspec@latest` with a comment above it, `gate` runs that command for `openspec validate`, and a value that is not a string exits 2 with `gate.openspec`

#### Scenario: SCN-DIST-002-10 Pinned OpenSpec version
- **WHEN** `init` writes `spec-ctx.toml` and `npx -y @fission-ai/openspec@latest --version` prints `1.15.0`
- **THEN** the file has `openspec = "npx -y @fission-ai/openspec@1.15.0"`, a failed or timed out command writes `@latest` and prints `note: could not read the OpenSpec version. [gate] openspec uses @latest.`, and the env var `SPECCTX_OPENSPEC` at init time is written as it is

#### Scenario: SCN-DIST-002-11 Loop keys
- **WHEN** `spec-ctx.toml` has no `[loop]` section, or `init` writes the file
- **THEN** `loadConfig` gives `max_attempts: 3` and `archive: "ask"`. The written file has both keys under `[loop]` with a comment above each, and 16 keys in all

### Requirement: REQ-DIST-003 Golden harness
`tests/parity/run.sh` SHALL run the TypeScript engine on `tests/fixtures/parity-repo/` for `build`, `status`, `query push main`, `related REQ-APPLY-005`, `bundle REQ-APPLY-001 --budget 3000`, `check`, `check --strict`. It SHALL diff each output and the index against the recorded goldens under `tests/fixtures/parity-golden/` and exit 1 on any difference. `run.sh --record` SHALL rewrite the goldens. The goldens were recorded from the Python engine before its removal.

#### Scenario: SCN-DIST-003-1 Green parity
- **WHEN** `tests/parity/run.sh` runs
- **THEN** it prints `parity: 7 commands identical` and exits 0

#### Scenario: SCN-DIST-003-2 Drift is caught
- **WHEN** the bundle order changes in the engine
- **THEN** `tests/parity/run.sh` exits 1 and names `bundle`

### Requirement: REQ-DIST-004 Publish and binaries
The `release` workflow SHALL run on push to `main`. It SHALL read `version` from `package.json`. When `spec-ctx@<version>` is not on npm, it SHALL publish with `NPM_TOKEN`, create the tag `v<version>` on that commit, and move the tag `v<major>` to it. It SHALL attach `bun build --compile` binaries for linux x64, darwin arm64, and darwin x64 to the GitHub release. When the version is on npm, it SHALL exit 0 and publish nothing.

Refs: ADR-001, REQ-GOV-007

#### Scenario: SCN-DIST-004-1 npx works
- **WHEN** `npx spec-ctx@<version> --version` runs on a clean machine with Node 22
- **THEN** it prints the version

#### Scenario: SCN-DIST-004-2 Binary works
- **WHEN** the linux x64 binary runs `--version`
- **THEN** it prints the version

#### Scenario: SCN-DIST-004-3 Same version twice
- **WHEN** a push to `main` lands and `package.json` holds a version that npm already has
- **THEN** the workflow prints `spec-ctx@<version> is on npm. Nothing to publish.` and exits 0

#### Scenario: SCN-DIST-004-4 Tags from the workflow
- **WHEN** the workflow publishes `0.1.0`
- **THEN** the tags `v0.1.0` and `v0` point at the published commit

### Requirement: REQ-DIST-005 GitHub Action
`action.yml` at the repo root SHALL run `specctx gate`, which covers `check`, both linters on the configured markdown paths, and `openspec validate --all`. Inputs: `version` (default latest), `strict` (default true), `markdown`, `specctx`. The action SHALL hold no gate logic of its own beyond choosing the `specctx` command.

Refs: REQ-GOV-003, REQ-CLI-004

#### Scenario: SCN-DIST-005-1 Action on agentrc
- **WHEN** agentrc CI uses `sonqh/spec-ctx@v0`
- **THEN** the job runs the three checks and passes on a clean tree

### Requirement: REQ-DIST-006 agentrc migration
agentrc SHALL run on the published package: `spec-ctx.toml` present, `tools/ctx/` removed, hooks and CI call `specctx`, evidence backfilled with `--manual "migrated"` for archived tasks. `specctx check --strict` SHALL pass there.

#### Scenario: SCN-DIST-006-1 agentrc green
- **WHEN** agentrc CI runs after the migration commit
- **THEN** the `specs` job passes with `specctx`

### Requirement: REQ-DIST-007 Python engine removed
After REQ-DIST-006 holds, `tools/ctx/` and the Python oracle run in `tests/parity/run.sh` SHALL be removed from this repo. The goldens stay. The hooks SHALL call `specctx` only. `CLAUDE.md` and `DELEGATION.md` SHALL no longer name the Python engine.

Refs: ADR-001

#### Scenario: SCN-DIST-007-1 No python left
- **WHEN** `src/`, `tests/`, `scripts/`, `skills/`, `schemas/`, `.githooks/`, `.github/`, `CLAUDE.md`, `README.md`, and `DELEGATION.md` are searched for `ctx.py`
- **THEN** there are no matches

### Requirement: REQ-DIST-008 Install from git before publish
`package.json` SHALL have a `prepare` script that builds `dist/` with Node only, so `npx -y github:sonqh/spec-ctx#<ref> --version` works without npm publish and without Bun. The action input `version` SHALL accept `github:sonqh/spec-ctx#<ref>` and pass it to `npx` unchanged. The README SHALL show both install forms until 1.0.

Refs: ADR-001, REQ-DIST-004

#### Scenario: SCN-DIST-008-1 npx from git
- **WHEN** `npx -y github:sonqh/spec-ctx#main --version` runs in a clean temp dir with Node 22 and no Bun
- **THEN** it prints the version and exits 0

#### Scenario: SCN-DIST-008-2 Action from git
- **WHEN** the action runs with `version: github:sonqh/spec-ctx#main`
- **THEN** it calls `npx -y github:sonqh/spec-ctx#main gate --strict`

### Requirement: REQ-DIST-009 Invalid config gives one line
A `spec-ctx.toml` that is not valid TOML SHALL give one line on stderr and exit 2 in every command that reads the config, `init` included. The line SHALL hold the file path and the parse error message. One shared function SHALL load the config for all of them. No command SHALL print a stack for it.

Refs: REQ-DIST-002, REQ-CLI-002

#### Scenario: SCN-DIST-009-1 Init
- **WHEN** `spec-ctx.toml` holds `ids = [` and `init --schema` runs
- **THEN** stderr is one line with the file path and the parse error. The exit code is 2 and no stack line shows

#### Scenario: SCN-DIST-009-2 Other commands
- **WHEN** the same file exists and `next`, `check`, and `adopt` run
- **THEN** each prints the same one line on stderr and exits 2

#### Scenario: SCN-DIST-009-3 Other config errors
- **WHEN** `spec-ctx.toml` holds `brackets = "yes"` under `[ids]` and `init --schema` runs
- **THEN** stderr is one line that names `ids.brackets` and the exit code is 2
