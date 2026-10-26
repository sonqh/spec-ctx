# notifications Specification

## Purpose
Users get a message for security events on their account.

## Requirements

### Requirement: New device
A login from a new device SHALL send an email within one minute. The email SHALL name the device, the time, the location by IP, and a revoke link.

#### Scenario: New device login
- **WHEN** a user logs in from a new device
- **THEN** an email with the four items arrives within a minute

### Requirement: Password change
A password change SHALL send an email with a revoke link for every session.

#### Scenario: Change mail
- **WHEN** a password changes
- **THEN** the email holds a link that revokes every session

### Requirement: Opt out
A user SHALL not be able to opt out of security emails. Marketing emails SHALL have a toggle.

#### Scenario: Settings
- **WHEN** a user opens notification settings
- **THEN** security emails have no toggle and marketing emails have one

### Requirement: Delivery log
Every sent email SHALL appear in the audit log with its template name and the delivery result.

#### Scenario: Logged
- **WHEN** an email is sent
- **THEN** an audit entry names the template and the result

### Requirement: Retry
A failed delivery SHALL retry 3 times over one hour and then stop.

#### Scenario: Three failures
- **WHEN** the mail service fails 3 times
- **THEN** no 4th attempt happens and the audit log says gave up

### Requirement: Language
The email SHALL use the language of the account. A missing language SHALL use English.

#### Scenario: French account
- **WHEN** the account language is fr
- **THEN** the email is in French

### Requirement: Revoke link
The revoke link in an email SHALL work once and SHALL expire after 24 hours.

#### Scenario: Second click
- **WHEN** the link is clicked twice
- **THEN** the second click shows that the link was used
