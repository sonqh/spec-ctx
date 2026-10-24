# Spec Delta

## Purpose

Defines the interactive question flow that turns a person's answers into a valid profile, with a default and a preview for every question.

## ADDED Requirements

### Requirement: REQ-ELIC-001 Twelve questions
`elicit` SHALL ask exactly twelve questions in this order: name, role, languages, frameworks, platform, autonomy, verbosity, explanations, destructive_ops, secrets_read, git workflow, agents to enable. Every other profile field SHALL take its default.

Refs: REQ-PROF-005, REQ-PROF-006

#### Scenario: SCN-ELIC-001-1 Count
- **WHEN** a user runs `elicit` and presses Enter on every prompt
- **THEN** exactly twelve prompts appear and a valid profile is written

### Requirement: REQ-ELIC-002 Preview per question
Each question SHALL show, under the prompt, one line naming what the answer generates, for example `destructive_ops: block -> 2 hooks for Claude Code, rule text for Codex`.

#### Scenario: SCN-ELIC-002-1 Preview text
- **WHEN** the destructive_ops question is shown
- **THEN** the preview line names the hook ids `block-rm-rf` and `block-push-main`

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
