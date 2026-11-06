## ADDED Requirements

### Requirement: REQ-JRN-007 Absolute package frames only
Every entry of `err.frames` SHALL come from a file with an absolute path inside the package. A frame whose file is not an absolute path, such as `node:internal/...` or `<anonymous>`, SHALL be skipped. This holds also when the working directory is under the package root.

Refs: REQ-JRN-002

#### Scenario: SCN-JRN-007-1 Non-absolute frames skipped
- **WHEN** an error stack holds `node:internal/modules/run_main:12`, `<anonymous>:1`, and a frame under the package root, and the working directory is under that root
- **THEN** `err.frames` holds only the package frame

### Requirement: REQ-JRN-008 Report takes no JSON flag
`specctx report` SHALL exit 2 with a usage error when it gets `--json`. It SHALL print nothing to stdout. The help page of `report` SHALL say that exit 2 covers this case. Without the flag, `report` prints Markdown as REQ-JRN-004 says.

Refs: REQ-JRN-004

#### Scenario: SCN-JRN-008-1 Report with the JSON flag
- **WHEN** `specctx report --json` runs in a repository with `openspec/`
- **THEN** it exits 2, stdout is empty, and stderr names the flag
