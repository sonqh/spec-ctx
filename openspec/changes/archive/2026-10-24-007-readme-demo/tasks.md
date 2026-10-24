# Tasks

## 1. Demo

- [x] 1.1 Write `docs/demo/record.sh`. It builds a temp fixture project from `tests/fixtures/no-id-repo` after `adopt`. It runs the six commands with short pauses. It records with `script` or `asciinema` to `docs/demo/loop.cast` and converts to `docs/demo/loop.svg` with `svg-term-cli` from npm. If no converter can be installed, it writes the cleaned transcript to `docs/demo/loop.txt` and the README embeds that in a code block. The whole recording stays under 60 seconds and under 400 kB. [REQ-GOV-003] Verify: `bash docs/demo/record.sh && test -s docs/demo/loop.cast && (test -s docs/demo/loop.svg || test -s docs/demo/loop.txt)`
- [x] 1.2 Rewrite README. Embed the demo under the first heading and add the transcript. Rewrite Status for six archived changes and the pending publish. Keep Install with both forms and the two paths. Lint. [REQ-GOV-003] Verify: `node dist/cli.js lint tells --baseline 0 README.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation README.md`
- [x] 1.3 Write `docs/verification/007.md`. Full gate. [REQ-GOV-001] Verify: `bash scripts/ci-local.sh`

## Workflow follow-up

- Archive with `/opsx:archive 007-readme-demo`, then `specctx build`.
