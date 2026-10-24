# Design

## Context

002 made `init` work for a hand-written profile. This change adds the two inputs that produce a profile. Both write drafts. Only `elicit` writes `profile.yaml`, and only after validation. See proposal.md.

## Goals / Non-Goals

**Goals:**
- A new user finishes `init` in under ten minutes.
- An existing user keeps every instruction they already had, either as a profile field or as an `imported-notes` rule.

**Non-Goals:**
- Perfect inference. 80 percent on the fixtures is the bar.
- Any LLM call outside `--assist`.

## Decisions

- Twelve fixed questions, not a dynamic tree. Alternative: branch on role. Rejected because a fixed list is testable with an answers file and the preview line does the teaching.
- `@clack/prompts` for the TUI. Alternative: inquirer. Rejected for size and because clack renders well in narrow terminals.
- Import is rule-based with a source path per inference. Alternative: LLM-based import. Rejected by ADR-002, and the report must be auditable.
- `--assist` is a separate module with a provider interface (`anthropic`, `openai`) and a prompt stored as a markdown file under `src/elicit/assist/prompt.md`, linted like other prose. The provider is chosen by which key is set. Follows ADR-002.
- Unmapped prose becomes an `imported-notes` rule with `paths: ["**"]`. Alternative: drop it with a warning. Rejected by ADR-001's consequence that import must not lose content.

## Risks / Trade-offs

- [Inference wrong on an unusual setup] → report shows the source path per field, draft is never applied without the user seeing it in elicit.
- [`--assist` leaks repository content to a provider] → the flag prints the file list it will send and asks for confirmation. Only manifests and README go.
- [Users skip the previews and accept defaults blindly] → `plan --diff` runs before the first apply.

## Migration Plan

Users on 002 keep working. `init --no-elicit` preserves the 002 path.

## Open Questions

- Whether to ask about `report_format` as a thirteenth question. Defer. Default `result-first` is fine for the MVP.
