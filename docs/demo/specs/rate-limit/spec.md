# rate-limit Specification

## Purpose
Login and reset endpoints have a rate limit per client and per account.

## Requirements

### Requirement: Per client
A client SHALL get at most 20 login attempts per minute. The window SHALL slide.

#### Scenario: Burst
- **WHEN** a client sends 21 attempts in a minute
- **THEN** the 21st gets 429

#### Scenario: After the window
- **WHEN** a client waits one minute after a 429
- **THEN** the next attempt is allowed

### Requirement: Per account
An account SHALL get at most 10 failed logins per hour from any client. A success SHALL reset the count.

#### Scenario: Spread attack
- **WHEN** two clients fail 6 times each on one account
- **THEN** the 11th attempt gets 429

#### Scenario: Reset
- **WHEN** a user logs in after 9 failures
- **THEN** the count returns to zero

### Requirement: Retry header
A 429 response SHALL carry a Retry-After header in seconds and a body that names the limit that fired.

#### Scenario: Header present
- **WHEN** a request gets 429
- **THEN** Retry-After is a positive integer and the body names per client or per account

### Requirement: Reset endpoint
The reset link endpoint SHALL allow 3 requests per email per hour.

#### Scenario: Fourth request
- **WHEN** a client asks for a 4th reset link for one email in an hour
- **THEN** the request gets 429 and no email is sent

### Requirement: Allow list
An admin SHALL be able to exempt an IP range from the per client limit for 24 hours.

#### Scenario: Exempt range
- **WHEN** an admin exempts a range
- **THEN** requests from it skip the per client limit and the audit log names the exemption

### Requirement: Metrics
The limiter SHALL expose a counter per limit and per outcome.

#### Scenario: Counter
- **WHEN** a request gets 429
- **THEN** the counter for that limit and outcome rises by one

### Requirement: Storage
Counters SHALL live in Redis. A Redis outage SHALL fail open for the per client limit and fail closed for the per account limit.

#### Scenario: Outage
- **WHEN** Redis does not answer
- **THEN** per client checks pass and per account checks return 503
