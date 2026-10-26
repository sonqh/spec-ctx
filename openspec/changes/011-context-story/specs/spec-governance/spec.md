# spec-governance (delta)

## MODIFIED Requirements

### Requirement: REQ-GOV-006 README order
`README.md` SHALL open with the title, a tagline of at most 25 words that names IDs, and an audience line. Then `## The problem`, `## What spec-ctx does` with a table whose last row is the Verify gate, `## Demo`, `## Quickstart`, `## How it finds the context` with a Mermaid graph, and `## The life cycle for agents`. No metric SHALL appear before `## Measured`, which cites the newest `docs/metrics/*.md` by name. Maintainer content SHALL live in `docs/CONTRIBUTING.md`.

Refs: REQ-GOV-003

#### Scenario: SCN-GOV-006-1 First screen
- **WHEN** a reader opens `README.md`
- **THEN** line 3 has at most 25 words and contains `IDs`, and the headers `## The problem`, `## What spec-ctx does`, `## Demo`, `## Quickstart`, `## How it finds the context`, `## The life cycle for agents` appear in that order before line 110

#### Scenario: SCN-GOV-006-2 Maintainer content moved
- **WHEN** `grep -c "^## Develop" README.md` runs
- **THEN** it prints 0 and `docs/CONTRIBUTING.md` has that section

#### Scenario: SCN-GOV-006-3 Current ratio
- **WHEN** the test reads `## Measured` and lists `docs/metrics/`
- **THEN** the section cites the newest metrics file by name, and no line before `## Measured` matches `docs/metrics/`

#### Scenario: SCN-GOV-006-4 Graph and life cycle
- **WHEN** the test reads the two new sections
- **THEN** the first holds a fenced `mermaid` block that names `REQ-UA-004` and `Covers`, and the second names `specctx-bootstrap`, `specctx-next`, `specctx-done`, and `handoff write`

### Requirement: REQ-GOV-008 Demo story
The demo SHALL run six captioned steps on the fixture before adopt. Steps: `adopt --dry-run` then `adopt`. `status`. `task next`. `task start` with its footer. A `task done` that fails with `The task stays open.`, the edit on screen, and a `task done` that passes. `handoff write` and the head of `.ctx/handoff.md`. Captions start with `# <n>.` and print dim. No `stats`. Under 30 seconds and 400 kB. `loop.txt` holds the transcript.

Refs: REQ-GOV-003, REQ-TASK-002, REQ-TASK-003, REQ-CLI-008

#### Scenario: SCN-GOV-008-1 Transcript has the story
- **WHEN** the test reads `docs/demo/loop.txt`
- **THEN** it has the lines `# 1.` to `# 6.` in order, `-> ### Requirement: REQ-`, `-- bundle `, `The task stays open.`, `done add-mfa/1.3`, and `$ specctx handoff write`, and no line starts with `$ specctx stats`

#### Scenario: SCN-GOV-008-2 Size
- **WHEN** the test stats `docs/demo/loop.svg` and reads the cast duration
- **THEN** the file is under 400 kB and the duration is under 30 seconds
