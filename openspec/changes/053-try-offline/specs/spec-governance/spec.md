## MODIFIED Requirements

### Requirement: REQ-GOV-012 README try-it block
The README SHALL hold `## Try it in two minutes` right after `## What spec-ctx adds`. Its bash block sits between `<!-- try:begin -->` and `<!-- try:end -->`, uses `npx -y spec-ctx` and `sed -i.bak`, and exits 0 in an empty directory under bash 3.2 and bash 5. A test SHALL run it with the local `dist/cli.js` in a temp dir, with `SPECCTX_OPENSPEC` set to the OpenSpec stand-in.

Refs: REQ-GOV-008, REQ-GOV-003

#### Scenario: SCN-GOV-012-1 The block runs
- **WHEN** the test replaces `npx -y spec-ctx` in the marked block with `node <root>/dist/cli.js` and runs it with bash in an empty temp dir
- **THEN** it exits 0 and prints the lines `refused, as expected` and `done add-mfa/1.1`
- **AND** the output of `context add-mfa/1.1` in the block holds `src/login.ts`
- **AND** the same holds under `/bin/bash` when that file exists and is not the bash on the PATH

#### Scenario: SCN-GOV-012-2 Place and markers
- **WHEN** the test reads the README
- **THEN** the `## Try it in two minutes` heading is the next `##` heading after `## What spec-ctx adds`, and each of the two markers appears once, begin before end

#### Scenario: SCN-GOV-012-3 Two notes under the block
- **WHEN** the test reads the lines after `<!-- try:end -->`
- **THEN** one line says that the bundle footer on a toy project can pass 100 percent of the spec text
- **AND** one line says that `status` prints a `next:` line for plan approval, which the `specctx-run` skill handles

#### Scenario: SCN-GOV-012-4 No npx call in the test
- **WHEN** the test runs the block with a recording `npx` first on the `PATH`
- **THEN** the recording `npx` gets no call

### Requirement: REQ-GOV-013 try.sh story
`scripts/try.sh` SHALL run the story of the README block against the local `dist/cli.js` in a temp dir. It copies `tests/fixtures/no-id-repo` and `docs/demo/specs/`, prints a `== ` heading before each step, runs `context add-mfa/1.3` after the passing `task done`, removes the temp dir on exit, and exits 0. It needs no network and no asciinema. It sets `SPECCTX_OPENSPEC` to `tests/fixtures/openspec-stub.sh`.

Refs: REQ-GOV-008, REQ-GOV-012

#### Scenario: SCN-GOV-013-1 The story
- **WHEN** the test runs `bash scripts/try.sh` after a build
- **THEN** it exits 0, the output holds `== ` headings, the line `refused, as expected`, and the line `done add-mfa/1.3`
- **AND** the output after the `context add-mfa/1.3` heading holds `src/login.ts`

#### Scenario: SCN-GOV-013-2 Cleanup
- **WHEN** `scripts/try.sh` ends with success, run with its own `TMPDIR`
- **THEN** that `TMPDIR` is empty, and `git status --porcelain` of the repository is the same as before the run

#### Scenario: SCN-GOV-013-3 Small share
- **WHEN** the test reads the `-- bundle` footer of the output
- **THEN** the share of spec text is under 25 percent

#### Scenario: SCN-GOV-013-4 No network
- **WHEN** the test runs `bash scripts/try.sh` with a recording `npx` first on the `PATH` and a shell value of `SPECCTX_OPENSPEC` that names that `npx`
- **THEN** the recording `npx` gets no call
