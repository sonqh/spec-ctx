# audit-log Specification

## Purpose
Every security event is written to an append only log.

## Requirements

### Requirement: Events logged
The log SHALL record login, logout, failed login, password change, password reset, session revocation, account lock, and admin actions.

#### Scenario: Failed login
- **WHEN** a login fails
- **THEN** one event with the reason and the client name is written

#### Scenario: Admin action
- **WHEN** an admin locks an account
- **THEN** one event names the admin, the account, and the time

### Requirement: Append only
No API SHALL delete or change a log entry. The storage SHALL reject an update at the database level.

#### Scenario: Delete attempt
- **WHEN** a client calls delete on an entry
- **THEN** the call gets 405

#### Scenario: Update attempt
- **WHEN** a process tries an update on the table
- **THEN** the database rejects it

### Requirement: Retention
Entries SHALL stay for 400 days. A nightly job SHALL remove older entries and SHALL write one summary entry with the count.

#### Scenario: Old entry
- **WHEN** an entry is 401 days old
- **THEN** the nightly job removes it and the summary names the count

### Requirement: Export
An admin SHALL be able to export the log as JSON lines for a date range of at most 31 days.

#### Scenario: Export range
- **WHEN** an admin exports one week
- **THEN** the file holds every entry of that week and nothing else

#### Scenario: Too long
- **WHEN** an admin asks for 32 days
- **THEN** the request gets 400 and names the limit

### Requirement: Entry shape
Every entry SHALL hold the event name, the time, the actor, the subject, the client name, and the IP address.

#### Scenario: Shape
- **WHEN** an entry is read
- **THEN** the six fields are present

### Requirement: Search
An admin SHALL be able to filter the log by actor, subject, event name, and time range.

#### Scenario: Filter
- **WHEN** an admin filters by one subject and one week
- **THEN** only entries that match both appear

### Requirement: Integrity
Each entry SHALL carry a hash of the previous entry so a gap is visible.

#### Scenario: Chain check
- **WHEN** the integrity job runs
- **THEN** it reports zero broken links on an untouched log
