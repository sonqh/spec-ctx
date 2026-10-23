# spec-ctx

A deterministic context engine and task workflow for [OpenSpec](https://github.com/Fission-AI/OpenSpec) projects.

OpenSpec gives you proposal, specs, design, and tasks. spec-ctx adds what an AI agent needs to work on them without reading the whole tree:

- Stable IDs on every requirement, scenario, decision, and task.
- An index that links IDs to code, tests, and each other.
- `bundle`: the few kilobytes of spec one task needs, with provenance.
- `task next`, `task start`, `task done`: the checkbox is written only after the task's `Verify:` command passed, and evidence is kept beside the tree.
- A generated handoff so the next session starts in one command.

No LLM in the loop. No daemon. Same bytes for the same files.

## Status

Specs written. Implementation in progress through three OpenSpec changes:

1. `001-engine-port`: port of the engine from Python to TypeScript, parity tested.
2. `002-ids-and-tasks`: ID allocation, task state machine, Verify runner, handoff.
3. `003-distribution`: schema bundle, skills, npm publish, GitHub Action, migration of the first user.

The engine was first built and used inside [sonqh/agentrc](https://github.com/sonqh/agentrc).

## Develop

```bash
bun install
bun run test
python3 tools/ctx/ctx.py status      # bootstrap engine until 001 lands
npx -y @fission-ai/openspec@latest validate --all --strict
git config core.hooksPath .githooks
```

## License

MIT.
