# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root. Tests build git repos under a temp dir and clear `SPECCTX_RERUN` first. No test reaches the network.

## 1. The wrapper

- [x] 1.1 Add the inputs `rerun` and `base` to `action.yml` and pass them as `INPUT_RERUN` and `INPUT_BASE`. In `action/run.sh` build `gate [--strict] --rerun [--base <value>]` when `rerun` is `true`, and refuse `pull_request_target` with one line, per 037/D1 and D2. Add `tests/action/rerun.sh` for SCN-DIST-010-1, SCN-DIST-010-2, SCN-DIST-011-1, and SCN-DIST-011-2 on a temp git repo. [REQ-DIST-005, REQ-DIST-010, REQ-DIST-011] Verify: `bun run build && bash tests/action/rerun.sh`

## 2. The reproduce line

- [x] 2.1 Quote the cwd in `reproduceLine` of `src/gate/rerun.ts` with `shq`, per 037/D5. Update the expectation in `tests/gate/compare.test.ts` and add a case with a space in the cwd for SCN-VER-007-3. [REQ-VER-007] Verify: `bun run build && bun test tests/gate`

## 3. The CI job

- [x] 3.1 Add the job `rerun` to `.github/workflows/ci.yml`, per 037/D3. Add `tests/action/rerun-job.sh`, which reads the job block, for SCN-GOV-010-1 and SCN-GOV-010-2. [REQ-GOV-010] Verify: `bash tests/action/rerun-job.sh`

## 4. The docs and the selftest

- [x] 4.1 Add the security bullets and the two inputs to the action section of `README.md`. Add `tests/action/rerun-docs.sh` for SCN-DIST-012-1. Call `rerun.sh`, `rerun-job.sh`, and `rerun-docs.sh` from `tests/action/selftest.sh`. [REQ-DIST-012, REQ-DIST-005] Verify: `bash tests/action/rerun-docs.sh && bash tests/action/selftest.sh`

## Workflow follow-up

- Run the steps under `operations.archive.guidance` in `openspec/config.yaml`.
- Archive with the command that `specctx next` prints.
- Run `npx -y @fission-ai/openspec@latest validate --all --strict` again before push.
