# skills Specification

## Purpose
Three skills teach an agent the loop. They are short because the CLI does the work.

## Requirements

### Requirement: REQ-SKL-001 Three skills
`skills/` SHALL hold `specctx-bootstrap` (run `status`, read handoff, run `task next`, run `task start`), `specctx-next` (pick and start the next task mid-session), and `specctx-done` (run `task done`, then `handoff write`). Each SKILL.md SHALL be under 60 lines, pass both linters, and name the exact commands.

#### Scenario: SCN-SKL-001-1 Line budget
- **WHEN** each SKILL.md is counted
- **THEN** none exceeds 60 lines

#### Scenario: SCN-SKL-001-2 Lint
- **WHEN** both linters run on each SKILL.md with baseline 0
- **THEN** all exit 0

### Requirement: REQ-SKL-002 Install paths
`specctx init --skills` SHALL copy the skills to `.claude/skills/` and `.agents/skills/`. `npx skills add sonqh/spec-ctx` SHALL install the same three. A test SHALL fail if the copies differ from `skills/`.

#### Scenario: SCN-SKL-002-1 Copies match
- **WHEN** `init --skills` runs
- **THEN** `diff -r skills/ .claude/skills/` for the three folders is empty
