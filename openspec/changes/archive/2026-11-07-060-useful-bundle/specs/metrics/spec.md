## ADDED Requirements

### Requirement: REQ-STAT-007 Card only matches
The recall report SHALL count, for each repo and each kind, the matched labels whose header line ends with `| body omitted`. It SHALL name the count `card_only`, print it next to the recall, and still count such a label as matched.

Refs: REQ-STAT-006, REQ-QRY-020

#### Scenario: SCN-STAT-007-1 Card only matches
- **WHEN** a labelled requirement prints as a card that ends with `| body omitted`, and a labelled file prints a plain card
- **THEN** both match, and `card_only` for the requirements is 1 and for the code is 0

#### Scenario: SCN-STAT-007-2 No card only matches
- **WHEN** every labelled entry prints with its body
- **THEN** `card_only` is 0 for each kind

