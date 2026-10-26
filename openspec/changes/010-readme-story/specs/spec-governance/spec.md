# spec-governance (delta)

## MODIFIED Requirements

### Requirement: REQ-GOV-006 README order
`README.md` SHALL open with the title, a tagline of at most 20 words that names Verify, and an audience line. Then `## The problem` with three bullets, `## What spec-ctx does` with a `Without | With spec-ctx` table, `## Demo`, and `## Quickstart`. No metric SHALL appear before `## Measured`, which cites the newest `docs/metrics/*.md` by name and explains each column. Maintainer content SHALL live in `docs/CONTRIBUTING.md`.

Refs: REQ-GOV-003

#### Scenario: SCN-GOV-006-1 First screen
- **WHEN** a reader opens `README.md`
- **THEN** line 3 has at most 20 words and contains `Verify`, and the headers `## The problem`, `## What spec-ctx does`, `## Demo`, `## Quickstart` appear in that order before line 60

#### Scenario: SCN-GOV-006-2 Maintainer content moved
- **WHEN** `grep -c "^## Develop" README.md` runs
- **THEN** it prints 0 and `docs/CONTRIBUTING.md` has that section

#### Scenario: SCN-GOV-006-3 Current ratio
- **WHEN** the test reads `## Measured` and lists `docs/metrics/`
- **THEN** the section cites the newest metrics file by name, and no line before `## Measured` matches `docs/metrics/`

## ADDED Requirements

### Requirement: REQ-GOV-008 Demo story
The demo SHALL run five captioned steps on the fixture. Steps: `task next`. A `task done` that fails with `The task stays open.`. The edit, with its content on screen. A `task done` that passes, plus the `git diff` of `tasks.md`. An edit and `check --strict` that prints `stale-evidence`. Captions start with `# <n>.` and print dim. No `stats`. Under 30 seconds and 400 kB. `loop.txt` holds the transcript.

Refs: REQ-GOV-003, REQ-TASK-003, REQ-CLI-008

#### Scenario: SCN-GOV-008-1 Transcript has the story
- **WHEN** the test reads `docs/demo/loop.txt`
- **THEN** it has the lines `# 1.` to `# 5.` in order, `The task stays open.`, `-- [ ] 1.3`, `+- [x] 1.3`, and `stale-evidence add-mfa/1.3`, and no line starts with `$ specctx stats`

#### Scenario: SCN-GOV-008-2 Size
- **WHEN** the test stats `docs/demo/loop.svg` and reads the cast duration
- **THEN** the file is under 400 kB and the duration is under 30 seconds
