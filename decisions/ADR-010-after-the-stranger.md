# ADR-010 After the stranger

Status: proposed. Date: 2026-11-07. The lead drafted it for the owner. It keeps every decision of ADR-006 to ADR-009. It adds the next order of work after the one of ADR-008, which is complete.

## Context

The order of work of ADR-008 closed on 2026-11-07, in changes 054 to 063, four days after the owner set it for 30 days. The measures:

- A stranger reaches a `context <task>` with spec blocks in 3 commands. Each command names the next one. On the no-ID fixture the three take 0.23 s.
- On PersonaKit, a real adopter, `report` gives 0.3 minutes and 1 run from `init-ok` to the first `context` with a code line.
- Recall within 8,000 characters: this repo 0.70 to 1.00, the OpenSpec fixture 0.34 to 1.00. The after figures count cards. On the fixture every labelled requirement is a card with `body omitted`, and `cited_body_lost` is 11 on this repo.
- Every card ends with trust labels. The word `current` prints nowhere.
- p95 of `context` stays under 200 ms, at about 130 ms.

What the work found:

- The recall target is met by cards. The next quality question is how many bodies the agent gets inside the budget, and which ones.
- The scanner names every change `main` when the `changes` glob is not `openspec/changes/**`. Two tasks then share one ID. Found in change 060.
- A file that a tag links to a cited requirement makes an earlier task stale when a later task edits it. The engineers hit this in 059, 060, 061, and 062. The one-file-per-task rule does not prevent it, because the citation graph reaches files that the tasks do not name.
- `openspec archive` leaves a `TBD` purpose in a new capability, and `stats --write` rewrites old rows of the metrics file. Both cost a manual step at every archive.
- The VACIP comparison left two ideas on the table: a query log with a miss class, and `impact <file>` with the Verify commands to run.

## Decision

1. The goal for the next 30 days is one thing. The agent acts on what `context` prints and reads less by hand. The measure is the share of cited requirement bodies that print inside the default budget, and the number of `bundle <ID>` calls an agent makes after one `context`.
2. The north star of ADR-008 stays, as a regression check. The journal reports it.
3. Order of work.
   1. Body recall. The recall report counts the cited requirement bodies that print, as `body_recall`. The target is 0.8 on this repo at the default budget. Changes that raise it come before the rest.
   2. The scanner names a change from the folder under the `changes` glob, not from a fixed path segment. A test with a non-default glob guards it.
   3. Stale by tag. `task done` records only the files that the task names or its Verify runs, plus the files the diff touched since `task start`. A tag alone does not put a file into the evidence. `check` keeps its rule.
   4. Archive hygiene. The archive guidance writes the purpose of a new capability from the proposal, and `stats --write` appends one row and leaves the old rows as they are.
   5. `impact <file>`. One command prints the requirements a file touches, the tasks that cite them, and the union of their Verify commands. Layer 1, built on the edges that exist.
   6. Query log. Each `context` run appends the requested IDs and the omitted IDs to the journal. `report` lists the IDs that lost their body most often. No new file, no network.
4. Scope rules. Every proposal names its layer and its measure, as ADR-007 item 7 says. Layer 1 keeps priority. Nothing in this list adds a server, a daemon, an LLM call, or a dependency.

## Consequences

- The recall report gains one figure and the targets of ADR-007 item 6 stay.
- Item 3 changes what `task done` writes. Evidence files of archived tasks do not change.
- Item 5 and 6 are the two VACIP ideas with a clear measure. Pinned invariants wait until a user asks for them.
