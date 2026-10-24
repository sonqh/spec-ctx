# ADR-001 TypeScript with Bun for development, Node 22 at run time

Status: accepted. Date: 2026-10-24.

## Decision

- spec-ctx is written in TypeScript.
- Bun runs the tests and the build. `bun build --compile` produces an optional single binary.
- The published package runs on Node 22 with no build step. `npx spec-ctx` works.
- Code uses only APIs that Node 22 provides. No Bun-only API such as `Bun.file` or `Bun.serve`.
- CI runs the test suite on both Bun and Node 22.

## Why

- OpenSpec, skills.sh, and agentrc are TypeScript. One toolchain for the user and the maintainers.
- The Python engine needed `python3` on the user's machine and could not ship through `npx`.
- The port costs about ten hours once. Two toolchains cost every week.

## Consequences

- Runtime dependencies stay minimal: `smol-toml` for the config file. Nothing else without a new ADR.
- Startup must stay fast. The CLI loads a command's code only when that command runs.
- The Python tests under `tests/parity/` are the contract for the port. The TypeScript engine must produce the same index and the same command output for the same fixture.

Refs: REQ-DIST-001, REQ-DIST-002
