## ADDED Requirements

### Requirement: REQ-QRY-027 Cited bodies before repeat lines
`bundle`, `context`, and `task start` SHALL fill two kinds of card after the bodies of class 0. The `named by` path cards come first. Then come the cards of the second and later code or test lines of one file. They replace the class 1 place that REQ-QRY-020 and REQ-QRY-021 give. The first line card of each file in print order keeps that place. The print order does not change. A card that does not fit goes to `truncated:`.

Refs: REQ-QRY-020, REQ-QRY-021

#### Scenario: SCN-QRY-027-1 Cited body first
- **WHEN** a task cites a requirement whose body fits only if a second line card of a file goes unprinted
- **THEN** the body prints and that line card goes to `truncated:`

#### Scenario: SCN-QRY-027-2 Named path before repeat line
- **WHEN** the room after the cited bodies holds one card, and the task has a `named by` path card and a repeat line card
- **THEN** the `named by` card prints and the repeat line card goes to `truncated:`

#### Scenario: SCN-QRY-027-3 First line stays
- **WHEN** lines 9 and 100 of one file and a line of another file all cite the task requirement and the budget is tight
- **THEN** the card of `:100` is first in print order and keeps its place. The card of `:9` fills after the bodies. The card order does not change
