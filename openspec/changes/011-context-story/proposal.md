# Proposal

## Why

The owner reviewed the 010 README on 2026-10-26 and set the order of the pitch. The evidence gate is good to have. The product is the context engine. Stable IDs on every OpenSpec artifact. A graph over them. A retrieval that gives an agent the few kilobytes one task needs. Three skills that carry the agent through the whole change life cycle without reading `openspec/specs/` by hand. The 010 README leads with the checkbox and mentions retrieval in one table row. Nothing explains how the IDs or the retrieval work. The demo never shows a bundle.

## What Changes

- The tagline, the problem bullets, and the table lead with IDs, context, and the life cycle. The Verify gate is the last row.
- A new section `## How it finds the context` after the quickstart. It holds a diagram of the ID graph and a `related` example that shows the reason of each link.
- A new section `## The life cycle for agents`: the three skills and the loop they teach, from `init --all` to `handoff write`. One rule: the agent never opens the spec tree by hand.
- `task start` ends with one footer line that says the bundle size and its share of the spec text, so the saving is visible in context.
- The demo tells the life cycle in six steps: `adopt --dry-run` on a repo without IDs, `status`, `task next`, `task start` with the footer, `task done`, `handoff write`. The failing Verify stays as step 5a. The stale check leaves the demo and stays in the README table.

Out of scope: engine changes beyond the footer, metric changes, Install and reference sections.

## Capabilities

### Modified Capabilities
- `task-workflow`: the `task start` footer.
- `spec-governance`: README order and the demo story.

## Impact

- `src/cli/workflow.ts`, `README.md`, `docs/demo/record.sh` and its outputs, `tests/gov/readme.test.ts`, `tests/gov/demo.test.ts`, `tests/tasks/`.
