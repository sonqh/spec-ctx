# task-workflow (delta)

## MODIFIED Requirements

### Requirement: REQ-TASK-001 Next task
`specctx task next [--change <name>]` SHALL pick the lowest numbered active change. In it, it SHALL pick the first open task whose earlier tasks in the same group are done. It SHALL print `<id>  <text>`, then the REQ IDs the task cites, then its Verify command. With no open task it SHALL print `no open task. Every task in the active changes is done. Next: archive <change>.` and exit 1. `--json` SHALL include `id`, `text`, `reqs`, `verify`, `bundle_command`.

#### Scenario: SCN-TASK-001-1 Order within a group
- **WHEN** tasks 2.1 is open and 2.2 is open
- **THEN** `task next` prints 2.1

#### Scenario: SCN-TASK-001-2 Skip done
- **WHEN** 1.1 and 1.2 are done and 1.3 is open
- **THEN** `task next` prints 1.3

#### Scenario: SCN-TASK-001-3 Nothing open
- **WHEN** every task in the active change `009-x` is done
- **THEN** it prints `no open task. Every task in the active changes is done. Next: archive 009-x.` and exits 1
