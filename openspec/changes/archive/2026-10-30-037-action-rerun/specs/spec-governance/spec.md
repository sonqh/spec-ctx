## ADDED Requirements

### Requirement: REQ-GOV-010 CI rerun job
`.github/workflows/ci.yml` SHALL have a job `rerun` that runs on `pull_request` only, with `permissions: contents: read`. It SHALL check out with `fetch-depth: 0`, install and build, then run the local action with `rerun: true`, `base: origin/${{ github.base_ref }}`, and `specctx: node dist/cli.js`.

Refs: REQ-DIST-010, REQ-GOV-005

#### Scenario: SCN-GOV-010-1 Job shape
- **WHEN** a reader opens the `rerun` job of `ci.yml`
- **THEN** it has the `pull_request` guard, `contents: read`, `fetch-depth: 0`, and a `uses: ./` step with the three inputs

#### Scenario: SCN-GOV-010-2 Push to main
- **WHEN** a push lands on `main`
- **THEN** the `rerun` job does not run
