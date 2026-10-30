## ADDED Requirements

### Requirement: REQ-DIST-013 Skills refresh leaves other files alone
`init --skills` without `--schema`, in a project that has `spec-ctx.toml`, SHALL write only the skill folders. It SHALL NOT change `.gitignore`, with or without `--force`. Plain `init` keeps its `.gitignore` lines.

Refs: REQ-DIST-002

#### Scenario: SCN-DIST-013-1 Skills only refresh
- **WHEN** `init --skills --force` runs in a project that already has `spec-ctx.toml` and a `.gitignore` without `adopt-report.md`
- **THEN** the command writes the skill folders and `.gitignore` keeps its bytes

#### Scenario: SCN-DIST-013-2 Skills only without force
- **WHEN** `init --skills` runs in a project that already has `spec-ctx.toml` and a `.gitignore` without `adopt-report.md`
- **THEN** the command writes the missing skill files and `.gitignore` keeps its bytes
