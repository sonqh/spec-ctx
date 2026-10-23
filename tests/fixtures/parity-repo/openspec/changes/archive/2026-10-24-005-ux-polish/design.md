# Design

## Context

Changes 001 to 004 built the engine. This change touches only the layer the user sees: prompts, output lines, help text, generated comments, and one content rule in compile. The engine contracts (REQ-APPLY-*, REQ-CAT-*) stay as they are, except where the spec text is reconciled with the code that already exists.

## Goals / Non-Goals

**Goals:**
- A first run reads as one guided flow with a clear end state.
- The user never sees an internal term without a one-line meaning next to it.
- Every error names the next command to run.
- The specs match the code for the six open questions.

**Non-Goals:**
- A TUI framework change. `@clack/prompts` stays.
- Localization.
- The `audit` command.

## Decisions

- Spec reconciliation follows the code where the code made the safer choice. Six items. Each is a MODIFIED requirement in this change. No new ADR. Refs: ADR-001.
- The question count stays at twelve core questions. The sandbox question is conditional. The extensions question is a thirteenth, always asked, with an empty default. Alternative: fold extensions into `init` after the questions. Rejected because the question is where the user learns the syntax.
- Preview text moves from the prompt title to the clack `hint` field. Alternative: a `note()` block under each prompt. Rejected because it doubles the vertical space on a narrow terminal.
- `plan` and `apply` print a summary table by default. `--diff` adds the unified diff. Alternative: keep full diff and add `--quiet`. Rejected because the default must fit on one screen.
- Agents that are not installed are handled by one question in `init`. The answer is written to `agents.<id>.enabled`. Alternative: keep the notice on every run. Rejected because the notice teaches nothing after the first time.
- Frameworks map to languages through a fixed table in `src/ic/languages.ts`. Unknown frameworks go to the global instructions only. Alternative: ask the user per framework. Rejected because the table covers the common cases and the fallback loses nothing.
- Catalog errors are built from a struct `{item, source, cause, fix}` and formatted in one place. Child process stderr goes to `--verbose` only. Follows REQ-CLI-004.
- `revert` prints one line after the restore that says whether `status` will now report drift and why. The lockfile semantics do not change. Refs: REQ-APPLY-007.

## Risks / Trade-offs

- Golden files change in many tests. Mitigation: regenerate them in one task and review the diff.
- The extensions question adds friction for users who want none. Mitigation: Enter accepts the empty default.
- The framework table will be incomplete. Mitigation: the fallback keeps every framework name in the global instructions.
