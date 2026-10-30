## MODIFIED Requirements

### Requirement: REQ-DIST-011 Event guard
`action/run.sh` SHALL exit 1 with one line and run no `specctx` command when `rerun` is `true` and `GITHUB_EVENT_NAME` is not `pull_request` or `push`. A Verify command is code from the pull request. `rerun` set to `false` SHALL not change for any event.

Refs: REQ-DIST-010

#### Scenario: SCN-DIST-011-1 Refused event
- **WHEN** `run.sh` runs with `GITHUB_EVENT_NAME=pull_request_target` and `INPUT_RERUN=true`
- **THEN** it exits 1, prints one line, and calls no `specctx` command

#### Scenario: SCN-DIST-011-2 Allowed events
- **WHEN** `run.sh` runs with `INPUT_RERUN=true` and the event is `pull_request` or `push`, then with the event `pull_request_target` and `INPUT_RERUN=false`
- **THEN** each run calls `specctx` and exits 0

#### Scenario: SCN-DIST-011-3 Other events refused
- **WHEN** `run.sh` runs with `INPUT_RERUN=true` and the event is `workflow_run`, `schedule`, or empty
- **THEN** each run exits 1, prints one line, and calls no `specctx` command
