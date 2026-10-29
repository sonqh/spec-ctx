# skills Specification

## Purpose
Three skills teach an agent the loop. They are short because the CLI does the work.

## Requirements

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
- **THEN** it names the skill `openspec-propose`
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

### Requirement: REQ-SKL-003 Plan and archive steps
`specctx-run` SHALL take the change name of `plan` from the request in kebab case and read requirements with `specctx bundle` or `specctx query`, never `openspec show`. The plan stop SHALL run `specctx handoff ask --change <c>`. `archive` SHALL run the steps of `operations.archive.guidance`, then the `command` field, then the post-archive checks. The skill SHALL name `npx -y @fission-ai/openspec@latest` for an absent `[gate] openspec`.

Refs: REQ-SKL-001, REQ-LOOP-005

#### Scenario: SCN-SKL-003-1 Plan steps
- **WHEN** the test reads `skills/specctx-run/SKILL.md`
- **THEN** it names `kebab case`, `specctx bundle`, `specctx query`, `openspec show`, and `specctx handoff ask --change <c> "plan ready for <c>. Approve to start the tasks?"`

#### Scenario: SCN-SKL-003-2 Archive steps
- **WHEN** the test reads `skills/specctx-run/SKILL.md`
- **THEN** it names `operations.archive.guidance`, the `command` field, and `npx -y @fission-ai/openspec@latest`, and it does not name `openspec-archive-change`
