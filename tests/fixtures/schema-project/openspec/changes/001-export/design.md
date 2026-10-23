# Design

## Context

The tool has no export yet.

## Goals / Non-Goals

**Goals:**
- One CSV file per export.

**Non-Goals:**
- Other formats.

## Decisions

- Write the CSV with a small local function. A library adds a dependency for ten lines. Refs: REQ-EXP-001, REQ-EXP-002

## Risks / Trade-offs

- Large exports use memory. Stream later if needed.
