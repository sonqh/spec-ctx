# auth

## Requirements

### Requirement: REQ-AU-001 Second factor
The app SHALL ask for a second factor.

#### Scenario: SCN-AU-001-1 Valid code
- **WHEN** the user enters a valid code
- **THEN** the login succeeds

### Requirement: REQ-AU-002 Single sign on
The app SHALL accept a login from the identity provider.

#### Scenario: SCN-AU-002-1 Valid assertion
- **WHEN** the provider sends a valid assertion
- **THEN** the login succeeds
