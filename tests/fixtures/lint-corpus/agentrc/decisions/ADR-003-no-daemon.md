# ADR-003 No daemon, no background sync

Status: accepted. Date: 2026-10-23.

## Decision

agentrc runs only when the user runs it. It never watches files and never writes without a `plan` the user can read first.

## Why

- agent-rules-sync uses a daemon with newest-wins. Users reported they could not tell who changed what.
- A daemon is hard to install on CI and on Windows.

## Consequences

- Drift between profile and disk is detected by `status`, not fixed automatically.
- Multi-machine sync is git on `~/.agentrc/`, not a service.

Refs: REQ-APPLY-002, REQ-CLI-003
