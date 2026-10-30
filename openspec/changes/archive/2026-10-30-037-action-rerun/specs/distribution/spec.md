## MODIFIED Requirements

### Requirement: REQ-DIST-005 GitHub Action
`action.yml` at the repo root SHALL run `specctx gate`, which covers `check`, both linters on the configured markdown paths, and `openspec validate --all`. Inputs: `version` (default latest), `strict` (default true), `markdown`, `specctx`, `rerun`, `base`. The action SHALL hold no gate logic of its own beyond choosing the `specctx` command and its flags.

Refs: REQ-GOV-003, REQ-CLI-004, REQ-DIST-010

#### Scenario: SCN-DIST-005-1 Action on agentrc
- **WHEN** agentrc CI uses `sonqh/spec-ctx@v0`
- **THEN** the job runs the three checks and passes on a clean tree

## ADDED Requirements

### Requirement: REQ-DIST-010 Action rerun inputs
The action SHALL take `rerun` (default `false`) and `base` (default empty). With `rerun` set to `true`, `action/run.sh` SHALL run `gate --rerun` and no other gate step. It adds `--base <value>` when `base` has a value and `--strict` when `strict` is true. With `rerun` not `true`, the command line stays as before.

Refs: REQ-DIST-005, REQ-CLI-009

#### Scenario: SCN-DIST-010-1 Rerun command line
- **WHEN** `run.sh` runs in a temp git repo with `INPUT_RERUN=true` and `INPUT_BASE=origin/main`
- **THEN** the recorded call is `gate --strict --rerun --base origin/main` with no `--markdown`

#### Scenario: SCN-DIST-010-2 Default command line
- **WHEN** `run.sh` runs with `INPUT_RERUN=false` and `INPUT_BASE=origin/main`
- **THEN** the recorded call is the default gate with `--markdown`, and it has no `--rerun` and no `--base`

### Requirement: REQ-DIST-011 Event guard
`action/run.sh` SHALL exit 1 with one line and run no `specctx` command when `GITHUB_EVENT_NAME` is `pull_request_target` and `rerun` is `true`. A Verify command is code from the pull request. Other events and `rerun` set to `false` SHALL not change.

Refs: REQ-DIST-010

#### Scenario: SCN-DIST-011-1 Refused event
- **WHEN** `run.sh` runs with `GITHUB_EVENT_NAME=pull_request_target` and `INPUT_RERUN=true`
- **THEN** it exits 1, prints one line, and calls no `specctx` command

#### Scenario: SCN-DIST-011-2 Allowed events
- **WHEN** `run.sh` runs with `INPUT_RERUN=true` and the event is `pull_request` or `push`, then with the event `pull_request_target` and `INPUT_RERUN=false`
- **THEN** each run calls `specctx` and exits 0

### Requirement: REQ-DIST-012 Rerun security boundary
The action section of the README SHALL state the security boundary of `rerun` as bullets. Use the `pull_request` and `push` events only. Never use `pull_request_target` or `workflow_run` with code from a pull request. Use read-only permissions and no secrets. A fork pull request needs the repository setting that asks for approval before a workflow runs. The job needs `fetch-depth: 0`.

Refs: REQ-DIST-010, REQ-DIST-011

#### Scenario: SCN-DIST-012-1 Boundary in the README
- **WHEN** a reader opens the action section of `README.md`
- **THEN** it names `pull_request_target`, `workflow_run`, `contents: read`, secrets, the approval setting for fork pull requests, and `fetch-depth: 0`
