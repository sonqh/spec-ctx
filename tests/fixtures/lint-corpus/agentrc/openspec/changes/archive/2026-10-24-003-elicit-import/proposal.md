# Proposal

## Why

After 002 a user must hand-write `profile.yaml` to use agentrc. The value of the tool is that they do not have to. This change adds the twelve-question TUI that produces a profile. It also adds `import`, which reads an existing Claude Code or Codex setup and proposes a profile from it.

## What Changes

- Add `elicit`: an interactive flow of 12 questions with defaults, each showing what it will generate.
- Add `import`: read `~/.claude` and `~/.codex`, infer profile fields, mark what was inferred, and write a draft.
- Make `init` run `import` when a config exists, then `elicit` for the remaining fields, then `plan --diff`, then `apply`.
- Add `--assist`: an optional LLM pass that proposes answers from a repository the user points at. Output is a draft only.

Out of scope: Cursor and Gemini import, catalog fetching, any LLM in compile or apply.

## Capabilities

### New Capabilities
- `elicit`: the question flow and its output.
- `import`: inference of a profile from existing agent config.

### Modified Capabilities
None.

## Impact

- New: `src/elicit/`, `src/import/`. Dependency: `@clack/prompts`.
- `init` behavior changes from "compile existing profile" to the full flow. The 002 behavior stays available as `init --no-elicit`.
- `--assist` needs an API key in the environment. Without it the flag prints how to set one and exits 2.
