## MODIFIED Requirements

### Requirement: REQ-APPLY-005 Lockfile
After a successful apply, agentrc SHALL, in the pending text, write `$AGENTRC_HOME/agentrc.lock`. The lockfile SHALL hold the profile digest, every catalog item digest, every artifact path with its content digest, the adapter versions, and the agentrc version. `status` SHALL compare the lockfile with disk.

Refs: ADR-004

#### Scenario: SCN-APPLY-005-1 Drift detected
- **WHEN** a user edits a managed block by hand after apply
- **THEN** `status` reports that artifact as `drifted` with the path
