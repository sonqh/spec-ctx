# user-auth Specification

## Purpose
Users sign in with a password and keep a session for a bounded time.

## Requirements

### Requirement: Session timeout
The system SHALL end a session after 30 minutes without activity.

#### Scenario: Idle session
- **WHEN** a user is idle for 30 minutes
- **THEN** the session ends

### Requirement: Password login
The system SHALL accept a user name and a password.

#### Scenario: Valid password
- **WHEN** the user enters the right password
- **THEN** the system opens a session

#### Scenario: Wrong password
- **WHEN** the user enters a wrong password
- **THEN** the system shows an error and opens no session

### Requirement: Remember device
The system SHALL keep a device trusted for 30 days after a login.

#### Scenario: Trusted device skips the prompt
- **WHEN** a user logs in again from a trusted device within 30 days
- **THEN** the system asks for no second factor
