# ADR-003 Deterministic engine: no LLM, no daemon

Status: accepted. Date: 2026-10-24.

## Decision

- No command of spec-ctx calls a language model. The engine is regex, file walks, hashes, and JSON.
- No long running process. No file watcher. Every command checks the index for staleness, rebuilds it if needed, answers, and exits.
- Given the same files, every command prints the same bytes.

## Why

- An agent must be able to trust the engine's answer without a second check. A model in the loop makes the answer a guess.
- A watcher adds a process to manage, a state to debug, and a surprise when it is not running.
- Deterministic output lets tests compare bytes and lets CI gate on it.

## Consequences

- Query is token match and ranking, not semantic search. That is enough at the size of a spec tree.
- Build must stay fast enough to run on every command. Target: under 1 s on 2,000 files.

Refs: REQ-IDX-004, REQ-QRY-001
