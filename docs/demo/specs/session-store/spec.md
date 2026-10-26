# session-store Specification

## Purpose
Sessions live in a store with a fixed lifetime and a revocation path.

## Requirements

### Requirement: Session lifetime
A session SHALL expire 12 hours after its last request. The server SHALL refresh the expiry on every authenticated request.

#### Scenario: Idle session
- **WHEN** a session has no request for 12 hours
- **THEN** the next request gets 401 and the client starts a new login

#### Scenario: Active session
- **WHEN** a session has one request every hour
- **THEN** the session stays valid for the whole day

### Requirement: Revocation
A user SHALL be able to revoke every session of the account in one call. The current session MAY stay open when the user asks for that.

#### Scenario: Revoke all
- **WHEN** the user calls revoke all and keeps the current session
- **THEN** every other session gets 401 on its next request

#### Scenario: Revoke self
- **WHEN** the user revokes all without the keep flag
- **THEN** the current session ends too

### Requirement: Store backend
The store SHALL keep sessions in Redis with a TTL equal to the lifetime. A Redis outage SHALL fail closed: no session is valid until Redis is back.

#### Scenario: TTL set
- **WHEN** a session is created
- **THEN** the Redis key has a TTL of 12 hours

#### Scenario: Redis down
- **WHEN** Redis does not answer
- **THEN** every authenticated request gets 503 and the audit log gets one entry per minute

### Requirement: Session record
A session record SHALL hold the user id, the creation time, the last request time, the client name, and the IP address at creation.

#### Scenario: Record shape
- **WHEN** a session is read from the store
- **THEN** the five fields are present and the times are ISO 8601

### Requirement: Concurrent sessions
An account SHALL have at most 10 live sessions. The oldest SHALL end when the 11th starts.

#### Scenario: Eleventh login
- **WHEN** a user logs in on an 11th device
- **THEN** the oldest session gets 401 on its next request and an audit entry names it

### Requirement: Session list
A user SHALL see every live session of the account with its client name, last request time, and a revoke button.

#### Scenario: List
- **WHEN** the user opens the session page
- **THEN** each live session appears once with the three fields

### Requirement: Cookie flags
The session cookie SHALL carry Secure, HttpOnly, and SameSite=Lax.

#### Scenario: Flags present
- **WHEN** the login response sets the cookie
- **THEN** the three flags are on the Set-Cookie header
