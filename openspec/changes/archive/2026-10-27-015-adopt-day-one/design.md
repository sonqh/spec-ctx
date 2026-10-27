# Design

## Decisions

- D1 `check` treats `missing-id` like `req-without-scn`: archived entries are exempt. The scan still parses the archived header, so `related` and `query --all` keep the history. Writing IDs into the archive is not an option. The archived header text is what the archive recorded, and `adopt` by REQ-ADOPT-001 scans only main specs and active deltas.
- D2 `missing-id` joins the baseline rules. The key is `missing-id <file> <title>`, because an entry without an ID has no ID to key on and two files may hold the same title. `baseline write` records them. `check` hides them. `baseline prune` drops them when the header gets an ID. A new header without an ID after the baseline has a new key and fires. This follows the ratchet rule of REQ-ADOPT-005: record the debt of today, show the debt of tomorrow.
- D3 The alternative for D2 was to make `adopt` give an unmatched MODIFIED header a fresh ID. Rejected. A MODIFIED block that matches nothing is a defect of the change. `openspec validate` already reports it as `Archive would refuse this delta`. A fresh ID would hide the defect and create a requirement that no main spec holds.
- D4 `task start` keeps its output shape: bundle text, then the footer. The hint goes on one line before the footer, only when the task cites no REQ: `task <id> cites no REQ. Find one with specctx query <term> --change <change> --kind req, then add [REQ-<CAP>-NNN] to the task line.` The `--json` output gets `hint` with the same text. The footer stays, so REQ-STAT-002 still reads the bundle size.
- D5 `query --kind` lowers the kind before the match. The index stores `req`, `scn`, `task`, `adr`, `decision`, `code`, `test` in lower case. A user types the kind as the ID shows it. Both spellings now work. The help example keeps lower case.

## Risks / Trade-offs

- A baseline that holds `missing-id` entries can hide one case. A later edit strips the ID from a header whose text equals a baselined one in the same file. The file and title key makes this rare. `adopt --dry-run` still lists every such header.
- The existing path test gains an archived change and an unmatched delta. It copies the fixture into a temp dir and writes both there, so `tests/fixtures/no-id-repo` keeps its goldens.

## Open Questions

None.
