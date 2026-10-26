# Design

## Goals / Non-Goals

**Goals:**
- A stranger reads the first screen and can say: this gives OpenSpec stable IDs, and the agent loads only the spec of one task.
- The reader sees how retrieval works before they see any command reference.
- The demo shows a bundle and its size next to the size of the tree.

**Non-Goals:**
- Changing the `bundle` command output. Parity goldens cover it.
- Dropping the Verify gate from the README. It moves down.

## Decisions

- D1 Tagline, line 3: `Stable IDs for OpenSpec. Your coding agent loads only the spec one task needs, and knows what to do next.` 21 words. Audience line as before.
- D2 Problem bullets, in order:
  1. The agent reads the whole `openspec/` tree for every task. Most of it is not about the task. Tokens go to text the agent will not use.
  2. OpenSpec links a change to a spec by header text. A reword breaks the link, and the agent loses the thread between requirement, code, and test.
  3. A new session starts cold. The agent does not know which task is next, what it already did, or which questions are open.
- D3 Table rows, in order. Context: the whole tree against the bundle of one task. Links: header text against IDs on every requirement, scenario, decision, and task, with code and test tags. Session start: cold against `status`, `task next`, and the generated handoff. Last, the Verify gate: a hand tick against a tick after Verify passes.
- D4 `## How it finds the context`, after `## Quickstart`. A Mermaid graph: the task node points at its requirement node. From there, edges go to its scenarios, to a decision record through `Refs:`, to `src/login.ts` through the code tag, and to the test file through `Covers:`. Use the fixture IDs in the graph. Three sentences follow. The ID is the stable key. The index is the graph of IDs. `bundle` walks the edges to the configured depth inside a character budget. Then the output of `specctx related` for the fixture requirement, which prints each neighbor with its reason.
- D5 `## The life cycle for agents`, after D4. The three skills and when each fires: `specctx-bootstrap` at session start, `specctx-next` after a task closes, `specctx-done` when the work is complete. The loop in six commands with one comment each. The rule in one line: the agent never opens `openspec/specs/` by hand. A link to `skills/`.
- D6 Footer. `task start` prints, after the bundle, one line: `-- bundle <n> chars, <p>% of <m> chars of spec text`. `<m>` is the sum of the `text` fields of every canonical req, scn, and decision entry, the same number `stats` uses. `bundle` itself does not print it. Modifies REQ-TASK-002.
- D7 Demo, six captioned steps on the fixture before adopt, under 30 seconds:
  1. `# 1. Give every requirement an ID` then `specctx adopt --dry-run | head -6`, then `specctx adopt`.
  2. `# 2. Where are we` then `specctx status`.
  3. `# 3. What is next` then `specctx task next`.
  4. `# 4. Only the spec this task needs` then `specctx task start add-mfa/1.3`, which ends with the footer.
  5. `# 5. Done means Verify passed` then `specctx task done add-mfa/1.3` that fails in red, the heredoc edit, then `task done` again in green.
  6. `# 6. Hand off to the next session` then `specctx handoff write` and `head -8 .ctx/handoff.md`.
  Replaces the 010 story. Modifies REQ-GOV-008.
- D8 `## Measured` stays as it is. The 010 problem bullet about stale evidence becomes one line under the Verify row of the table.

## Risks / Trade-offs

- Six steps in 30 seconds means short pauses. Keep each pause at 1.2 seconds and the typing delay at 0.02 seconds.
- The footer adds one line to `task start` output. The skills quote the bundle format, not the footer, so they do not change.
- A Mermaid block does not render on npm. The README is read on GitHub first.

## Open Questions

None.
