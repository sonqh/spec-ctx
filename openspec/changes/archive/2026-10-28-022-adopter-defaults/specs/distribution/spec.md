# distribution (delta)

## MODIFIED Requirements

### Requirement: REQ-DIST-002 Config file and init
`spec-ctx.toml` SHALL hold `scan`, `ids`, `bundle`, `verify`, `gate.markdown` (default `[]`), `gate.openspec`. Absent keys default. `init` SHALL write a commented default, `test/**` or `lib/**` if only that dir exists, the detected OpenSpec version, and its four `.gitignore` lines if absent. `--schema` adds the schema, `--skills` the skills, `--all` both. It keeps `spec-ctx.toml`. Without `--force` it keeps and lists changed files.

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
