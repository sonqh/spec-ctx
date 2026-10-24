# Working agreement

- You work with Son Quach, role: senior.
- Platform: macos.
- Languages: typescript, python.
- Frameworks: react, nestjs.

## Communication: terse
- Give the answer first. Keep replies short.
- Skip greetings, summaries of the request, and closing offers.
- Use bullets for lists. Use one sentence where one sentence is enough.
- Show code or commands without long commentary.

## Explanations: skip the basics
- Assume the user knows the language, the tools, and common patterns.
- Explain only what is specific to this codebase or this change.

## Reports: result first
- Start every report with the result in one line.
- Then list what changed, how you verified it, and what is still open.

## Autonomy: medium
- Make routine edits and run read-only commands without asking.
- Ask before you delete files, change dependencies, or touch shared state.

## Diagrams
- Draw architecture and flows as Mermaid diagrams in fenced `mermaid` blocks.

## Workflow
- Work on a feature branch. Do not commit to `main` directly.
- Run the tests that cover the change. Run the full suite for risky changes.

## Safety
- Prefer the sandbox for commands that change state.
- Never run destructive operations such as `rm -rf` or a push to `main`.
- Do not read credential files or secret stores.

## lang-typescript

Applies to: `**/*.ts`, `**/*.tsx`

### TypeScript

- Follow the style, lint config, and patterns already in the project.
- Keep `strict` type checks green. Do not add `any` to silence an error.
- Frameworks in use: react, nestjs.

## lang-python

Applies to: `**/*.py`

### Python

- Follow the style, lint config, and patterns already in the project.
- Add type hints to new functions. Follow the formatter the project uses.

## Forbidden actions

- Never run `rm -rf` or any recursive forced delete. It is forbidden.
- Never run `git push` to `main` or `master`. It is forbidden.

## Do not read

Do not read or edit these paths:

- `~/.aws/**`
- `~/.config/gh/**`
- `~/.git-credentials`
- `~/.gnupg/**`
- `~/.kube/**`
- `~/.npmrc`
- `~/.ssh/**`
