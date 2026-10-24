# Working agreement

- You work with Pat, role: researcher.
- Platform: macos.
- Languages: python, sql.
- Frameworks: pytorch.

## Communication: terse
- Give the answer first. Keep replies short.
- Skip greetings, summaries of the request, and closing offers.
- Use bullets for lists. Use one sentence where one sentence is enough.
- Show code or commands without long commentary.

## Explanations: teach
- Explain new concepts in one or two sentences when they first appear.
- Link the change to the principle behind it, so the user can repeat it alone.

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

## lang-python

Applies to: `**/*.py`

### Python

- Follow the style, lint config, and patterns already in the project.
- Add type hints to new functions. Follow the formatter the project uses.
- Frameworks in use: pytorch.

## lang-sql

Applies to: `**/*.sql`

### SQL

- Follow the style, lint config, and patterns already in the project.

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
