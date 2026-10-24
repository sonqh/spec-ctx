#!/usr/bin/env bash
# REQ-DIST-005 the action only picks the specctx command. specctx gate holds the gate logic.
set -euo pipefail
specctx=${INPUT_SPECCTX:-}
if [ -z "$specctx" ]; then
  version=${INPUT_VERSION:-latest}
  # REQ-DIST-008 a git spec such as github:sonqh/spec-ctx#<ref> goes to npx unchanged
  case "$version" in
    *:*|*/*) specctx="npx -y $version" ;;
    *) specctx="npx -y spec-ctx@$version" ;;
  esac
fi
strict=""
[ "${INPUT_STRICT:-true}" = "true" ] && strict="--strict"
$specctx gate $strict --markdown "${INPUT_MARKDOWN:-openspec/**/*.md decisions/*.md *.md}"
