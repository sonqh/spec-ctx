# ADR-005 All markdown follows the ste-humanize skill

Status: accepted. Date: 2026-10-23.

## Decision

Every markdown file in this repo (specs, proposals, designs, ADRs, README, CLAUDE.md) is written or rewritten with the `ste-humanize` skill in Human mode. Tool descriptions and error strings in code use Strict mode.

## Why

- Specs are read by agents with no back-channel. A sentence with two readings costs a wrong implementation.
- Specs are also read by people. Flat STE alone is hard to read for a page.

## Consequences

- No semicolons and no dashes in prose. One instruction per sentence. Bullets for parallel parts.
- Technical terms stay as the field uses them, in any language.
- `specctx lint tells` and `specctx lint ste`, the TypeScript port of the skill linters, run in CI on `openspec/**/*.md` and `decisions/*.md` with `--baseline 0`.

Refs: REQ-GOV-003
