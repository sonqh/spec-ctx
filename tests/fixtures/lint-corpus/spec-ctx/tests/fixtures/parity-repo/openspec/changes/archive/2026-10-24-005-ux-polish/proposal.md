# Proposal

## Why

The MVP engine works. A product review of a first run found that the experience around it does not. A new user sees a phantom `audit` command and a 45-line diff of `settings.json`. They see three `degraded:` lines for an agent that agentrc skipped. When they press Enter through the questions, `CLAUDE.md` says "You work with me, role: mid". The extensions feature, the main reason to use agentrc, is invisible: the generated profile has `skills: []` and no hint about the reference syntax.

The same review confirmed six spec conflicts that the implementing agent resolved on its own. The specs must say what the code does, or the specs stop being the contract.

## What Changes

- Reconcile the six open questions in `.ctx/handoff.md` into the specs. No code change for these.
- Fix content bugs: frameworks attach to their language, not to every rule file.
- Make `init` a guided flow: intro, questions with hints, summary of changes, confirm, outro with next steps.
- Require a real name. Take it from `git config user.name` as the default. Remove the default for role.
- Add one question for extensions, with the reference syntax shown.
- Ask once about agents that are not installed. Stop repeating the notice.
- Group the help into basic and advanced commands. Add `--version`. Hide `audit` until it exists.
- Print a summary per file by default. Print the full diff only with `--diff`.
- Show degradations only for agents that will be written.
- Make every "not ready" error point to `agentrc init`.
- Make `revert` explain what state the user is in afterwards.
- Format catalog fetch errors as item, source, cause, fix. Never print raw stderr.
- Write comments and an extensions example into the generated `profile.yaml`.

Out of scope: new adapters, the `audit` command itself, any change to the apply engine or the lockfile format, a web UI.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `elicit`: intro and outro, name and role rules, hints, extensions question, agent availability question.
- `cli`: command groups, `--version`, summary output, unified not-ready error, degradation filter.
- `apply-pipeline`: `remove` action, revert follow-up message, outro after apply.
- `adapter-contract`: marker position.
- `adapter-claude-code`: `~/.mcp.json` exception.
- `intermediate-config`: frameworks per language.
- `import`: notes handling, next step line.
- `catalog-resolver`: fetch error format.
- `profile-schema`: generated profile comments, reference error example.

## Impact

- `src/elicit/`, `src/cli/`, `src/ic/`, `src/catalog/resolve.ts`, `src/profile/`. No new dependency.
- Golden files for `profile.yaml` and for `plan` output change.
- Exit codes do not change.
