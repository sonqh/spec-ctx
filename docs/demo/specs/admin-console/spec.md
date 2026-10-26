# admin-console Specification

## Purpose
Admins see accounts and sessions and can act on them.

## Requirements

### Requirement: Search
An admin SHALL find an account by email, user id, or client name. The search SHALL answer in under one second for 10 million accounts.

#### Scenario: By email
- **WHEN** an admin searches an email
- **THEN** the account appears in under one second

### Requirement: Force logout
An admin SHALL be able to revoke every session of an account. The action SHALL need a reason of at least 10 characters.

#### Scenario: Revoke
- **WHEN** an admin clicks revoke all and gives a reason
- **THEN** the sessions are gone and an audit entry names the admin and the reason

### Requirement: Lock account
An admin SHALL be able to lock an account so that login fails with a fixed message that names support.

#### Scenario: Locked login
- **WHEN** a locked account tries to log in
- **THEN** the response says the account is locked and names support

### Requirement: Two person rule
Deleting an account SHALL need a second admin to confirm within 10 minutes.

#### Scenario: No confirm
- **WHEN** no second admin confirms in 10 minutes
- **THEN** nothing is deleted and the request expires

#### Scenario: Confirmed
- **WHEN** a second admin confirms in time
- **THEN** the account is deleted and both admins appear in the audit entry

### Requirement: Roles
The console SHALL have the roles viewer, operator, and owner. Only owner SHALL delete accounts or change roles.

#### Scenario: Operator delete
- **WHEN** an operator tries to delete an account
- **THEN** the action is not shown and the API returns 403

### Requirement: Session view
An admin SHALL see every live session of an account with the same fields the user sees.

#### Scenario: View
- **WHEN** an admin opens an account
- **THEN** its sessions appear with client name and last request time

### Requirement: Audit link
Every account page SHALL link to the audit log filtered by that account.

#### Scenario: Link
- **WHEN** an admin clicks the audit link
- **THEN** the log shows entries for that subject only
