# verify-runner

## ADDED Requirements

### Requirement: REQ-VER-004 Working directory prefix
A Verify code span MAY start with `cwd=<path> `. The runner SHALL run the rest of the command with that path, relative to the project root, as the working directory. A path outside the project root SHALL exit 2. The prefix SHALL be stripped from the command stored in evidence and `cwd` SHALL be stored as its own field.

Refs: REQ-VER-001, REQ-TASK-004

#### Scenario: SCN-VER-004-1 Fixture cwd
- **WHEN** the task line has ``Verify: `cwd=tests/fixtures/no-id-repo npx openspec validate --all` ``
- **THEN** the command runs inside that folder and the evidence has `cwd: "tests/fixtures/no-id-repo"`

#### Scenario: SCN-VER-004-2 Outside root
- **WHEN** the prefix is `cwd=../other`
- **THEN** `task done` exits 2 and names the path
