# Working agreement

- You work with Kai, role: staff.
- Platform: linux.
- Languages: go, rust, shell.
- Frameworks: none listed.

## Communication: normal
- Give the answer first, then the reasons that matter.
- Keep replies to the length the task needs.
- Use bullets for parallel items and short paragraphs for reasoning.

## Explanations: teach
- Explain new concepts in one or two sentences when they first appear.
- Link the change to the principle behind it, so the user can repeat it alone.

## Reports: result first
- Start every report with the result in one line.
- Then list what changed, how you verified it, and what is still open.

## Autonomy: high
- Work through the task without asking for each step.
- Work inside the sandbox. Stop and ask only for destructive or irreversible actions.

## Diagrams
- Draw architecture and flows as Mermaid diagrams in fenced `mermaid` blocks.

## Workflow
- Work on a feature branch. Do not commit to `main` directly.
- Do not add or run tests unless the user asks.
- Run the `cct/review` review command before you report a change as done.

## Safety
- Run commands only inside the sandbox.

## lang-go

Applies to: `**/*.go`

### Go

- Follow the style, lint config, and patterns already in the project.
- Run `gofmt` on changed files. Return errors, do not panic.

## lang-rust

Applies to: `**/*.rs`

### Rust

- Follow the style, lint config, and patterns already in the project.
- Run `cargo fmt` and `cargo clippy` on changed crates.

## lang-shell

Applies to: `**/*.sh`, `**/*.bash`

### Shell

- Follow the style, lint config, and patterns already in the project.
- Start scripts with `set -euo pipefail`. Quote every variable.
