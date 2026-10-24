# Proposal

## Why

Passwords alone are weak. Users want a second factor, and the session timeout is too long.

## What Changes

- Add a TOTP second factor.
- Shorten the session timeout to 15 minutes.
- Rename "Remember device" to "Trusted device".

## Capabilities

### New Capabilities

### Modified Capabilities
- `user-auth`: second factor, shorter timeout, renamed trusted device.

## Impact

- The login flow and the session store.
