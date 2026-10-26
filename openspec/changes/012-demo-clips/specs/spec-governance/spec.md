# spec-governance (delta)

## MODIFIED Requirements

### Requirement: REQ-GOV-006 README order
`README.md` SHALL open with the title, a tagline of at most 25 words that names IDs, and an audience line. Then, in order: `## What OpenSpec is`, one paragraph. `## The problem`. `## What spec-ctx adds`, a table whose last row is the Verify gate. `## See it work`, six `### <n>.` sub headings, each with an SVG clip between two short paragraphs. `## Quickstart`. `## How it finds the context` with a Mermaid graph. `## The life cycle for agents`. No metric before `## Measured`.

Refs: REQ-GOV-003

#### Scenario: SCN-GOV-006-1 First screen
- **WHEN** a reader opens `README.md`
- **THEN** line 3 has at most 25 words and contains `IDs`, and the headers `## What OpenSpec is`, `## The problem`, `## What spec-ctx adds`, `## See it work`, `## Quickstart`, `## How it finds the context`, `## The life cycle for agents` appear in that order

#### Scenario: SCN-GOV-006-2 Maintainer content moved
- **WHEN** `grep -c "^## Develop" README.md` runs
- **THEN** it prints 0 and `docs/CONTRIBUTING.md` has that section

#### Scenario: SCN-GOV-006-3 Current ratio
- **WHEN** the test reads `## Measured` and lists `docs/metrics/`
- **THEN** the section cites the newest metrics file by name, and no line before `## Measured` matches `docs/metrics/`

#### Scenario: SCN-GOV-006-4 Graph and life cycle
- **WHEN** the test reads the two sections after the quickstart
- **THEN** the first holds a fenced `mermaid` block that names `REQ-UA-004` and `Covers`, and the second names `specctx-bootstrap`, `specctx-next`, `specctx-done`, and `handoff write`

#### Scenario: SCN-GOV-006-5 Six clips
- **WHEN** the test reads `## See it work`
- **THEN** it holds `### 1.` to `### 6.` in order, each followed within 4 lines by an image link to `docs/demo/clips/<n>-*.svg`

### Requirement: REQ-GOV-008 Demo story
The demo SHALL be six clips under `docs/demo/clips/`, one command each, recorded in order on one project before adopt: `adopt --dry-run` then `adopt`. `status`. `task next`. `task start` with its footer. A `task done` that fails with `The task stays open.`, the edit, and a `task done` that passes. `handoff write` with the head of the handoff. No caption inside a clip. Each clip under 7 seconds. All SVGs under 400 kB together. `loop.txt` holds the six transcripts, one heading line per step.

Refs: REQ-GOV-003, REQ-TASK-002, REQ-TASK-003, REQ-CLI-008

#### Scenario: SCN-GOV-008-1 Transcript has the story
- **WHEN** the test reads `docs/demo/loop.txt`
- **THEN** it has the lines `# 1.` to `# 6.` in order, `-> ### Requirement: REQ-`, `-- bundle `, `The task stays open.`, `done add-mfa/1.3`, and `$ specctx handoff write`, and no line starts with `$ specctx stats`

#### Scenario: SCN-GOV-008-2 Size
- **WHEN** the test stats the six SVG files and reads each cast duration
- **THEN** the sizes sum to under 400 kB and every duration is under 7 seconds

#### Scenario: SCN-GOV-008-3 Numbers match the text
- **WHEN** the test reads the `-- bundle` line of `loop.txt` and the step 4 text of the README
- **THEN** the character count and the percent in the README equal the ones in the footer
