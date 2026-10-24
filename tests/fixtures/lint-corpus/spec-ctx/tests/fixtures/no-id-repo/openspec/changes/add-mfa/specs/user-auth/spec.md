# user-auth

## ADDED Requirements

### Requirement: Second factor
The system SHALL ask for a TOTP code after a valid password.

#### Scenario: Valid code
- **WHEN** the user enters the current TOTP code
- **THEN** the system opens a session

#### Scenario: Expired code
- **WHEN** the user enters a code older than 30 seconds
- **THEN** the system rejects it

## RENAMED Requirements

- FROM: `### Requirement: Remember device`
- TO: `### Requirement: Trusted device`

## MODIFIED Requirements

### Requirement: Session timeout
The system SHALL end a session after 15 minutes without activity.

#### Scenario: Idle session
- **WHEN** a user is idle for 15 minutes
- **THEN** the session ends

### Requirement: Trusted device
The system SHALL keep a device trusted for 30 days after a login with a second factor.

#### Scenario: Trusted device skips the prompt
- **WHEN** a user logs in again from a trusted device within 30 days
- **THEN** the system asks for no second factor
