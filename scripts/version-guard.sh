#!/usr/bin/env bash
# REQ-GOV-007 reject a staged change to "version" in package.json unless the subject starts with "release:".
# Subject source: the message file in $1, else $SPECCTX_COMMIT_SUBJECT, else .git/COMMIT_EDITMSG.
set -euo pipefail
if ! git diff --cached -U0 -- package.json | grep -Eq '^[-+][[:space:]]*"version":'; then
  exit 0
fi
if [ -n "${1:-}" ] && [ -f "$1" ]; then
  subject=$(grep -v '^#' "$1" | head -n1 || true)
elif [ -n "${SPECCTX_COMMIT_SUBJECT:-}" ]; then
  subject="$SPECCTX_COMMIT_SUBJECT"
else
  subject=$(head -n1 "$(git rev-parse --git-dir)/COMMIT_EDITMSG" 2>/dev/null || true)
fi
case "$subject" in
  release:*) exit 0 ;;
esac
echo 'package.json version changed. A version bump publishes to npm. Use a commit subject that starts with "release:".' >&2
exit 1
