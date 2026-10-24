# import

## MODIFIED Requirements

### Requirement: REQ-IMP-004 Unmanaged content preserved
Text in `CLAUDE.md` or `AGENTS.md` that agentrc cannot map to a profile field SHALL stay in that file, above or below the managed block, untouched by apply. `import` SHALL print it in the report under `kept in place` with its file path. The draft SHALL not carry a `rules` entry for it. `init` SHALL print one line after apply that says the existing text stayed in place.

Refs: REQ-CLD-002, REQ-CDX-002

#### Scenario: SCN-IMP-004-1 Custom paragraph
- **WHEN** `CLAUDE.md` has a paragraph about a private monorepo
- **THEN** the report lists that paragraph under `kept in place` and after apply the paragraph is still in `CLAUDE.md`

## ADDED Requirements

### Requirement: REQ-IMP-006 Next step line
The `import` report SHALL end with the line `Next: agentrc init` and one sentence that says the draft values become the defaults in the questions.

#### Scenario: SCN-IMP-006-1 Report tail
- **WHEN** `import` runs
- **THEN** the last two lines contain `Next: agentrc init` and the word `defaults`
