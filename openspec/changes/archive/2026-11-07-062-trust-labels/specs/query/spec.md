## ADDED Requirements

### Requirement: REQ-QRY-023 Provenance class
Each card of `bundle`, `context`, and `task start` SHALL carry a fifth column: `declared`, `tagged`, `structural`, or `verified`. `declared` is a written link: requested, ref, citation, task line, or named path. `tagged` is a `// REQ` or `Covers:` tag. `structural` is a derived edge of a change, a capability, or a main version. `verified` is a tagged line whose file sits in the evidence of a done task that cites its requirement, with the same hash.

Refs: REQ-QRY-003, REQ-QRY-020

#### Scenario: SCN-QRY-023-1 Classes
- **WHEN** `context` runs on a task that cites a requirement with a tagged code line, a tagged test line, and a change delta
- **THEN** the requested task card ends with `declared`, the code and test cards with `tagged`, and the delta card with `structural`, each in the fifth column

#### Scenario: SCN-QRY-023-2 Verified line
- **WHEN** a done task cites REQ-X, its fresh evidence lists `src/a.ts`, and `src/a.ts` holds a REQ-X tag
- **THEN** the card of that code line ends with `verified`

#### Scenario: SCN-QRY-023-3 Changed file
- **WHEN** `src/a.ts` changed after the evidence, or no done task cites its requirement
- **THEN** its card ends with `tagged` and never `verified`

#### Scenario: SCN-QRY-023-4 Old columns
- **WHEN** a card ends with `| body omitted`
- **THEN** the marker follows the trust columns, and the first four columns equal those of change 060

### Requirement: REQ-QRY-024 Task evidence state
A task card SHALL carry a sixth column after the provenance: `fresh`, `stale since <path>`, or `no evidence`. A done task of an active change is `fresh` when every file of its evidence has its recorded hash. Else it is `stale since` the first stale path, as `staleOf` finds it. A done task of an archived change with evidence is `fresh`. Any other task is `no evidence`. No card prints `current`.

Refs: REQ-QRY-023, REQ-CHK-003, REQ-LOOP-008

#### Scenario: SCN-QRY-024-1 Fresh
- **WHEN** a done task of an active change has evidence whose files match their hashes
- **THEN** its card ends with `fresh`

#### Scenario: SCN-QRY-024-2 Stale
- **WHEN** one evidence file of a done task changed
- **THEN** its card ends with `stale since <path>`, the same path as `check --strict` reports

#### Scenario: SCN-QRY-024-3 No evidence
- **WHEN** a task is open, or done with no evidence file
- **THEN** its card ends with `no evidence`

#### Scenario: SCN-QRY-024-4 Archived
- **WHEN** a done task of an archived change has an evidence file
- **THEN** its card ends with `fresh`, and with no evidence file it ends with `no evidence`

### Requirement: REQ-QRY-025 Requirement evidence state
A requirement card SHALL carry the sixth column `verified` when at least one done task that cites the requirement has `fresh` evidence under REQ-QRY-024. Else it SHALL carry `unverified`. A main version and a delta copy get the state of their ID. The engine reads each evidence file at most once per run and stops at the first fresh task.

Refs: REQ-QRY-024

#### Scenario: SCN-QRY-025-1 Verified
- **WHEN** a requirement has one citing task with fresh evidence and one with stale evidence
- **THEN** its card ends with `verified`

#### Scenario: SCN-QRY-025-2 Unverified
- **WHEN** no task cites the requirement, or every citing task is open, stale, or has no evidence
- **THEN** its card ends with `unverified`

#### Scenario: SCN-QRY-025-3 Main version
- **WHEN** a requirement has a main version and a delta copy in an active change
- **THEN** both cards carry the same state

### Requirement: REQ-QRY-026 Trust fields in JSON
`bundle --json` and `context --json` SHALL print `used` and `blocks`. `used` is the code point length of the printed blocks. It is the figure of the budget and of the `over budget:` line. It differs from `chars` by the `note:`, `truncated:`, and `over budget:` lines. `blocks` lists each printed block in order with `id`, `file`, `line`, `status`, `reason`, `provenance`, and `evidence`, which is null for a kind with no state.

Refs: REQ-QRY-019, REQ-QRY-023, REQ-QRY-025

#### Scenario: SCN-QRY-026-1 Used and chars
- **WHEN** `context --json` runs at a budget that omits one entry
- **THEN** `used` equals the code point length of the printed blocks, `chars` is greater, and the two differ by the `truncated:` line

#### Scenario: SCN-QRY-026-2 Block objects
- **WHEN** `context <task> --json` runs
- **THEN** `blocks` holds one object per printed block in print order, and each has the seven fields, with `evidence` null for a code line

#### Scenario: SCN-QRY-026-3 Block mode
- **WHEN** `bundle REQ-X --block --json` runs
- **THEN** `blocks` is empty and `used` equals `chars`

#### Scenario: SCN-QRY-026-4 Task start
- **WHEN** `task start <task> --json` runs
- **THEN** its `bundle` object holds `used` and `blocks`

## MODIFIED Requirements

### Requirement: REQ-QRY-020 Cards before bodies
`bundle`, `context`, and `task start` SHALL print the card of each entry of class 0, 1, and 2 before the body of any block that is not requested. The card is a line that starts `-- <id> | <file>:<line> | <status> | <reason>`. An entry whose body does not fit keeps its card, which then ends with `| body omitted`. A card that does not fit goes to `truncated:`. The print order does not change.

Refs: REQ-QRY-003, REQ-QRY-012, REQ-QRY-018

#### Scenario: SCN-QRY-020-1 Cards survive long bodies
- **WHEN** a task cites 5 requirements whose bodies fill the budget, and they have 3 code lines and 2 test lines
- **THEN** all 5 code and test lines print, and every cited requirement has its card

#### Scenario: SCN-QRY-020-2 Body omitted marker
- **WHEN** the body of a depth 1 requirement does not fit
- **THEN** its card ends with `| body omitted`, its body is absent, and its ID is not in `omitted`

#### Scenario: SCN-QRY-020-3 Many deltas
- **WHEN** the change of a task holds 14 delta requirements that cannot all fit at the default budget
- **THEN** the output holds 14 delta cards, and the trailer names none of them

#### Scenario: SCN-QRY-020-4 Card lost
- **WHEN** `context` runs with `--budget 0` on a task with depth 1 entries
- **THEN** the task block prints, the trailer names the depth 1 entries, and no card ends with the marker

#### Scenario: SCN-QRY-020-5 Everything fits
- **WHEN** every block fits in the budget
- **THEN** no card ends with the marker, and the output has no `truncated:` line
