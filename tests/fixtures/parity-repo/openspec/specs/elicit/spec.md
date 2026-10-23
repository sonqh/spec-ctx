# elicit Specification

## Purpose
Defines the interactive question flow that turns a person's answers into a valid profile, with a default and a preview for every question.

## Requirements

### Requirement: REQ-ELIC-001 Twelve questions
`elicit` SHALL ask twelve core questions in this order: name, role, languages, frameworks, platform, autonomy, verbosity, explanations, destructive_ops, secrets_read, git workflow, agents to enable. It SHALL ask a sandbox question only when autonomy is `high` and sandbox is `none`, and one extensions question last. Every other field SHALL come from the current profile, else the import draft, else its default.

Refs: REQ-PROF-005, REQ-PROF-006, REQ-ELIC-009

#### Scenario: SCN-ELIC-001-1 Count
- **WHEN** a user runs `elicit` and presses Enter on every prompt
- **THEN** exactly thirteen prompts appear and a valid profile is written

#### Scenario: SCN-ELIC-001-2 Sandbox prompt is conditional
- **WHEN** the user picks autonomy `medium`
- **THEN** no sandbox prompt appears

#### Scenario: SCN-ELIC-001-3 Existing profile wins over defaults
- **WHEN** `profile.yaml` exists with `working_style.report_format: narrative` and the user runs `elicit`
- **THEN** the written profile keeps `report_format: narrative`

### Requirement: REQ-ELIC-002 Preview per question
Each question SHALL show one line that names what the answer generates. The line SHALL be rendered as the prompt hint in a dim color, not as part of the prompt title. For select questions each option SHALL carry its own hint. Example: `destructive_ops: block -> 2 hooks for Claude Code, rule text for Codex`.

#### Scenario: SCN-ELIC-002-1 Preview text
- **WHEN** the destructive_ops question is shown
- **THEN** the hint for `block` names the hook ids `block-rm-rf` and `block-push-main`

#### Scenario: SCN-ELIC-002-2 Title stays one line
- **WHEN** any question is shown
- **THEN** the prompt title contains no newline

### Requirement: REQ-ELIC-003 Defaults from import
When a draft from `import` exists, each question SHALL default to the imported value and mark it `(imported)`. The user SHALL be able to accept all imported values with one keypress.

Refs: REQ-IMP-003

#### Scenario: SCN-ELIC-003-1 Accept all
- **WHEN** a draft covers 9 of 12 fields and the user chooses "accept imported"
- **THEN** only the 3 remaining questions are asked

### Requirement: REQ-ELIC-004 Validation inline
An answer that fails the profile validator SHALL be rejected at the prompt with the allowed values, and the question SHALL repeat.

Refs: REQ-PROF-011

#### Scenario: SCN-ELIC-004-1 Autonomy high with sandbox none
- **WHEN** the user picks autonomy `high` and later sandbox `none`
- **THEN** the sandbox prompt repeats with the message from SCN-PROF-006-1

### Requirement: REQ-ELIC-005 Non-interactive mode
`elicit --answers <file.yaml>` SHALL read answers from a file and ask nothing. A missing answer SHALL use the default. This mode SHALL be used by tests.

#### Scenario: SCN-ELIC-005-1 Answers file
- **WHEN** `elicit --answers tests/fixtures/answers/minimal.yaml` runs
- **THEN** the written profile equals `tests/golden/profiles/minimal.yaml`

### Requirement: REQ-ELIC-006 Assist draft
`elicit --assist <repo path>` SHALL send the repository's manifest files and top-level README to an LLM and receive a draft of answers. The draft SHALL be shown as defaults marked `(suggested)`. Nothing from the LLM SHALL reach the profile without the user confirming each question or choosing "accept suggested".

Refs: ADR-002

#### Scenario: SCN-ELIC-006-1 No API key
- **WHEN** `--assist` runs without `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- **THEN** elicit exits 2 and prints the two variable names

#### Scenario: SCN-ELIC-006-2 Suggestions are defaults only
- **WHEN** the LLM suggests `role: staff`
- **THEN** the role question shows `staff (suggested)` and waits for input

### Requirement: REQ-ELIC-007 Intro and outro
`init` SHALL print an intro before the first question. The intro SHALL say what agentrc does, which directories it may write, and that nothing is written before the user confirms. After a successful apply `init` SHALL print an outro with: the files written, the command to check them (`agentrc status`), the command to undo (`agentrc revert`), and the path of `profile.yaml`.

Refs: REQ-APPLY-010

#### Scenario: SCN-ELIC-007-1 Intro content
- **WHEN** `init` starts in a terminal
- **THEN** the first output names `~/.claude` and `~/.codex` and says nothing is written before confirmation

#### Scenario: SCN-ELIC-007-2 Outro content
- **WHEN** `init` applies two files
- **THEN** the last output lists both paths, `agentrc status`, `agentrc revert`, and the profile path

### Requirement: REQ-ELIC-008 Name and role defaults are visible
The name question SHALL default to `git config user.name` when it is set, else to empty. An empty name SHALL repeat the prompt. The role question SHALL place the cursor on `mid` when no imported or current value exists, and the hint SHALL say that Enter picks it. In `--answers` mode a missing name or role SHALL exit 2 with a message that names the field.

#### Scenario: SCN-ELIC-008-1 Git name as default
- **WHEN** `git config user.name` returns `Son Quach`
- **THEN** the name prompt shows `Son Quach` as its initial value

#### Scenario: SCN-ELIC-008-2 Empty name repeats
- **WHEN** the user clears the name and presses Enter
- **THEN** the prompt repeats with the message `name: enter a name.`

#### Scenario: SCN-ELIC-008-3 Answers file without role
- **WHEN** `--answers` points at a file with no `role` key and no profile exists
- **THEN** `elicit` exits 2 and the message contains `role`

### Requirement: REQ-ELIC-009 Extensions question
After the core questions `elicit` SHALL ask for catalog references as a comma-separated list. The hint SHALL show one example of each source form: `skills/<owner>/<name>` and `cct/<path>`. Each entry SHALL be validated with the reference parser before the next prompt. An invalid entry SHALL repeat the prompt with the parser message and the example. The answer SHALL be stored in `extensions.skills`.

Refs: REQ-CAT-001, REQ-PROF-008

#### Scenario: SCN-ELIC-009-1 Empty default
- **WHEN** the user presses Enter on the extensions prompt
- **THEN** `extensions.skills` is `[]`

#### Scenario: SCN-ELIC-009-2 Bad reference repeats
- **WHEN** the user enters `github:sonqh/x`
- **THEN** the prompt repeats and the message contains `skills/<owner>/<name>`

### Requirement: REQ-ELIC-010 Agents that are not installed
When an agent in the answer to the agents question is not installed, `init` SHALL ask once: keep it enabled or disable it. The answer SHALL be written to `agents.<id>.enabled`. After that, `plan`, `apply` and `status` SHALL not print an "is not installed" notice for a disabled agent. For an enabled agent that is not installed they SHALL print the notice once per run, on stderr.

Refs: REQ-ADPT-003

#### Scenario: SCN-ELIC-010-1 Disable on first run
- **WHEN** Codex is not installed and the user answers "disable"
- **THEN** the profile has `agents.codex.enabled: false` and the next `plan` prints no notice about Codex

#### Scenario: SCN-ELIC-010-2 Answers mode keeps the agent
- **WHEN** `--answers` lists `codex` and Codex is not installed
- **THEN** the profile keeps `codex` enabled and `plan` prints one notice on stderr
