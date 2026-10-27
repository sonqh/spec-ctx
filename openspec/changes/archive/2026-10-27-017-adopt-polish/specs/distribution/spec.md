# distribution (delta)

## MODIFIED Requirements

### Requirement: REQ-DIST-002 Config file and init
`spec-ctx.toml` SHALL hold `scan`, `ids.caps`, `ids.task_pattern`, `bundle.budget`, `bundle.depth`, `verify.timeout_s`, `gate.markdown`. Missing keys take defaults. `init` SHALL write a commented default file, with `test/**` or `lib/**` if only that dir exists, and add its two `.gitignore` lines if absent. `--schema` adds the schema, `--skills` the skills, `--all` both. It never replaces `spec-ctx.toml`. Without `--force` it keeps and lists changed files.

Refs: ADR-001, REQ-SCH-003, REQ-SKL-002

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
- **THEN** `gate` lints only the files under `docs/`, and a project without the key lints `openspec/**/*.md decisions/*.md docs/**/*.md *.md`

#### Scenario: SCN-DIST-002-6 Gitignore lines
- **WHEN** `init` runs in a project whose `.gitignore` lacks `.ctx/index.json` and `adopt-report.md`, or has no `.gitignore`
- **THEN** the file ends with a `# spec-ctx` comment and both lines, the output has `wrote .gitignore (2 lines)`, and a second run prints `kept .gitignore` and leaves the file byte-identical

#### Scenario: SCN-DIST-002-7 Ignored skills dir
- **WHEN** `.gitignore` has a line `.claude/` and `init --skills` writes the skills
- **THEN** the output has one line `note: .gitignore ignores .claude/. The skills under .claude/skills/ stay out of git. The copies under .agents/skills/ are tracked.`

#### Scenario: SCN-DIST-002-8 Test and code dirs
- **WHEN** `init` runs in a project with `test/` and `lib/` at the root and no `tests/` or `src/`
- **THEN** `spec-ctx.toml` has `tests = ["test/**"]` and `code = ["lib/**"]`, each with its comment above, and a project with `tests/` and `src/` gets `tests/**` and `src/**`
