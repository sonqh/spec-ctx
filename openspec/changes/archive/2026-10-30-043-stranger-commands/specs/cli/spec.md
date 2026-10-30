## ADDED Requirements

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
