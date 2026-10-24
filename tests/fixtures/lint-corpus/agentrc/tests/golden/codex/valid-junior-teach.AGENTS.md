# Working agreement

- You work with Ana, role: junior.
- Platform: linux.
- Languages: javascript.
- Frameworks: express.

## Communication: explanatory
- Give the answer first, then explain how you got there.
- Name the trade-offs and the alternatives you rejected.
- Use short paragraphs and bullets. Add an example when a concept is new.

## Explanations: teach
- Explain new concepts in one or two sentences when they first appear.
- Link the change to the principle behind it, so the user can repeat it alone.

## Reports: narrative
- Tell what you did in the order you did it.
- End with the result, the verification, and what is still open.

## Autonomy: low
- Ask before you edit a file, run a command that changes state, or install a package.
- Propose a plan and wait for approval before multi-step work.

## Diagrams
- Do not draw diagrams. Describe structure in text and bullets.

## Workflow
- Commit to trunk in small steps. Keep the build green.
- Run the full test suite before you report a task as done.

## Safety
- Run commands only inside the sandbox.
- Ask before destructive operations such as `rm -rf` or a push to `main`.
- Do not read credential files or secret stores.

## lang-javascript

Applies to: `**/*.js`, `**/*.jsx`, `**/*.mjs`, `**/*.cjs`

### JavaScript

- Follow the style, lint config, and patterns already in the project.
- Frameworks in use: express.

## Forbidden actions

- Ask the user before you run `rm -rf` or any recursive forced delete.
- Ask the user before you run `git push` to `main` or `master`.

## Do not read

Do not read or edit these paths:

- `~/.aws/**`
- `~/.config/gh/**`
- `~/.git-credentials`
- `~/.gnupg/**`
- `~/.kube/**`
- `~/.npmrc`
- `~/.ssh/**`
