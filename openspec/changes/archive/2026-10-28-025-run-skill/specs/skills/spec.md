# skills (delta)

## RENAMED Requirements
- FROM: `### Requirement: REQ-SKL-001 Three skills`
- TO: `### Requirement: REQ-SKL-001 One skill`

## MODIFIED Requirements

### Requirement: REQ-SKL-001 One skill
`skills/` SHALL hold `specctx-run`. It SHALL loop: run `specctx next --json`, act on `action`, run `specctx handoff write`, repeat until `action` is `stop` or `human` is true. It SHALL name the exact commands for each of the ten actions and stop on any other value. `specctx-bootstrap`, `specctx-next`, and `specctx-done` SHALL stay for one release as aliases that name `specctx-run`. Each SKILL.md SHALL be under 60 lines and pass both linters.

Refs: ADR-006

#### Scenario: SCN-SKL-001-1 Line budget
- **WHEN** each SKILL.md is counted
- **THEN** none exceeds 60 lines

#### Scenario: SCN-SKL-001-2 Lint
- **WHEN** both linters run on each SKILL.md with baseline 0
- **THEN** all exit 0

#### Scenario: SCN-SKL-001-3 Every action has its commands
- **WHEN** the test reads `skills/specctx-run/SKILL.md`
- **THEN** it names `specctx next --json`, `specctx handoff write`, and each of `plan`, `cite`, `start`, `work`, `fix`, `repair`, `gate`, `archive`, `ask`, `stop`
- **THEN** it names the skills `openspec-propose` and `openspec-archive-change`
- **THEN** it names `specctx task start <t>`, `specctx task done <t>`, `specctx gate --strict`, `specctx query --change <c> --kind req`, and `specctx check --strict`

#### Scenario: SCN-SKL-001-4 Aliases
- **WHEN** the test reads the SKILL.md of `specctx-bootstrap`, `specctx-next`, and `specctx-done`
- **THEN** each has six lines, keeps its own `name:`, and names `specctx-run`

#### Scenario: SCN-SKL-001-5 No bypass
- **WHEN** the test reads `skills/specctx-run/SKILL.md`
- **THEN** it says never to tick a checkbox by hand and never to use `--manual` on a task with a Verify command
- **THEN** it says never to call `/opsx:apply` and never to read `openspec/specs/` directly

### Requirement: REQ-SKL-002 Install paths
`specctx init --skills` SHALL copy every folder under `skills/` to `.claude/skills/` and `.agents/skills/`. `npx skills add sonqh/spec-ctx` SHALL install the same folders. A test SHALL fail if the copies differ from `skills/`.

#### Scenario: SCN-SKL-002-1 Copies match
- **WHEN** `init --skills` runs
- **THEN** `diff -r skills/ .claude/skills/` for every folder under `skills/` is empty
