## ADDED Requirements

### Requirement: REQ-QRY-028 Impact of a file
`impact <file>` SHALL list the requirements of the direct edges of the file (REQ-QRY-006): tags, `Covers:` tags, and task lines that name it. A task that names the file adds the requirements it cites, with the reason `task names <path> in <task>`. It SHALL list the active tasks that cite a listed requirement or name the file. It SHALL count archived tasks. `--archived` lists them.

Refs: REQ-QRY-006, REQ-QRY-021

#### Scenario: SCN-QRY-028-1 Tag and named path
- **WHEN** `src/a.ts` carries a tag of REQ-AB-001 and an active task that cites REQ-AB-002 names `src/a.ts`
- **THEN** REQ-AB-001 has the reason `implements` and REQ-AB-002 has the reason `task names src/a.ts in` that task. The tasks hold that task and every other active task that cites either

#### Scenario: SCN-QRY-028-2 Archived tasks
- **WHEN** an archived task cites a requirement of the file
- **THEN** the output lists no archived task and counts it, and `--archived` lists it

#### Scenario: SCN-QRY-028-3 Scenario in a tag line
- **WHEN** a test line reads `Covers: REQ-AB-001, SCN-AB-001-1`
- **THEN** the requirements hold REQ-AB-001 once, and the output holds no scenario row

### Requirement: REQ-QRY-029 Impact output
Each task of `impact` SHALL carry `fresh`, `stale since <path>`, or `no evidence` (REQ-QRY-024). Each requirement SHALL carry `verified` or `unverified` (REQ-QRY-025). `--json` SHALL carry the same facts. A file with no edge prints `no links: <path>`, exit 0. A missing file, a directory, or a path outside the root prints the error of `related`, exit 2.

Refs: REQ-QRY-024, REQ-QRY-025, REQ-QRY-008

#### Scenario: SCN-QRY-029-1 Labels
- **WHEN** a listed task has evidence that is stale since `src/a.ts`
- **THEN** its line carries `stale since src/a.ts`

#### Scenario: SCN-QRY-029-2 No edge and bad path
- **WHEN** `impact` runs on a file with no edge, on a directory, and on a path outside the root
- **THEN** the first prints `no links:` with exit 0, the other two print an error with exit 2

#### Scenario: SCN-QRY-029-3 Json
- **WHEN** `impact src/a.ts --json` runs
- **THEN** stdout is one JSON document with `file`, `requirements`, `tasks`, `verify`, and `archived`, and the same facts as the text

### Requirement: REQ-QRY-030 Impact verify plan
The verify plan of `impact` SHALL hold each `Verify:` command of listed and archived tasks once for each cwd and command. A manual Verify adds none. The plan drops a command whose path token names no file under the root (REQ-TASK-004). Commands of active tasks come first, then the others, each group in code point order. The plan shows 10 commands, then `<n> more. Use --all.`.

Refs: REQ-QRY-028, REQ-TASK-004

#### Scenario: SCN-QRY-030-1 Order and dedupe
- **WHEN** an active and an archived task share one command, two tasks run one command in different cwd, and one task has a manual Verify
- **THEN** the shared command appears once in the active group, the two cwd give two entries, and the manual task adds none

#### Scenario: SCN-QRY-030-2 Cap and all
- **WHEN** the plan holds 12 commands
- **THEN** the default prints 10 and the line `2 more. Use --all.`, and `--all` prints 12 with no such line

#### Scenario: SCN-QRY-030-3 Missing file
- **WHEN** an archived task runs `bun test tests/gone.test.ts`, a file that no longer exists
- **THEN** the plan holds no such command and the `archived:` line counts it as dropped
