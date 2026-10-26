# password-policy Specification

## Purpose
Passwords follow one policy that the server checks on every change.

## Requirements

### Requirement: Minimum length
A password SHALL have at least 12 characters and at most 128. The server SHALL not require a character class.

#### Scenario: Short password
- **WHEN** a user sets an 11 character password
- **THEN** the server rejects it and names the minimum

#### Scenario: Long passphrase
- **WHEN** a user sets a 40 character passphrase with spaces
- **THEN** the server accepts it

### Requirement: Breached passwords
The server SHALL reject a password that appears in the breach list. The check SHALL use a k-anonymity range query and SHALL never send the full hash.

#### Scenario: Known password
- **WHEN** a user sets a password from the list
- **THEN** the server rejects it and says the password appeared in a breach

#### Scenario: List unreachable
- **WHEN** the breach service does not answer
- **THEN** the server accepts the password and writes a warning to the audit log

### Requirement: Rotation
The server SHALL not force a rotation on a schedule. A rotation SHALL be forced only after a breach notice for that account.

#### Scenario: No expiry
- **WHEN** a password is 2 years old
- **THEN** login still works without a prompt

#### Scenario: Forced
- **WHEN** an admin marks the account as breached
- **THEN** the next login asks for a new password before anything else

### Requirement: Reset link
A reset link SHALL expire after 15 minutes and after one use. The link SHALL carry a random token of at least 128 bits.

#### Scenario: Used link
- **WHEN** a reset link is used twice
- **THEN** the second use fails with a fixed message

#### Scenario: Old link
- **WHEN** a reset link is 16 minutes old
- **THEN** it fails with the same message

### Requirement: Reuse
A new password SHALL differ from the last 5 passwords of the account.

#### Scenario: Repeat
- **WHEN** a user sets a password used 3 changes ago
- **THEN** the server rejects it

### Requirement: Hashing
Passwords SHALL be stored with Argon2id with the parameters in the config. A login with an older hash SHALL rehash on success.

#### Scenario: Rehash
- **WHEN** a user with a bcrypt hash logs in
- **THEN** the stored hash is Argon2id after the login

### Requirement: Change confirmation
A password change SHALL need the current password or a valid reset link.

#### Scenario: No current password
- **WHEN** a logged in user changes the password without the current one
- **THEN** the server rejects it
