## ADDED Requirements

### Requirement: REQ-GOV-011 README links for npm
Every link and image in `README.md` that points into the repository SHALL be an absolute `https://github.com/sonqh/spec-ctx/blob/main/` URL. An image MAY use `https://raw.githubusercontent.com/sonqh/spec-ctx/main/`. npm shows the README without `docs/`. A test SHALL fail on a relative target. The README SHALL say next to `adopt --dry-run` that the exit code is 1 when headers need IDs.

Refs: REQ-GOV-006, REQ-ADOPT-001

#### Scenario: SCN-GOV-011-1 No relative target
- **WHEN** the README test reads `README.md`, then a copy with the link `docs/getting-started.md` and a copy with an image at `docs/demo/clips/1-adopt.svg`
- **THEN** the real file passes, both copies fail, and a target that starts with `#` or `https://` passes

#### Scenario: SCN-GOV-011-2 Dry run exit code
- **WHEN** a reader looks at the `adopt --dry-run` line of the README
- **THEN** one short sentence next to it says the exit code is 1 when headers need IDs, and `adopt --dry-run` still exits 1 in that case
