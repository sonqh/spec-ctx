# ADR-002 No LLM in the compile and apply path

Status: accepted. Date: 2026-10-23.

## Decision

`compile`, `render`, `plan`, `apply` are deterministic. Same profile, same catalog digests, same output bytes. An LLM may assist `elicit` through an explicit `--assist` flag. Its output is a profile draft that goes through the same deterministic compile.

## Why

- Golden-file tests need stable output.
- Users must trust what gets written into `~/.claude` and `~/.codex`. A diff they can read beats a model they cannot audit.

## Consequences

- The mapping from profile fields to artifacts is a table in code, not a prompt.
- New behavior means a new mapping row and a new golden file.

Refs: REQ-IC-001, REQ-APPLY-001, ADR-001
