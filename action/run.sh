#!/usr/bin/env bash
# REQ-DIST-005 the action only picks the specctx command. specctx gate holds the gate logic.
set -euo pipefail
# REQ-DIST-011 a Verify command is code from the pull request, so a rerun never runs on pull_request_target
if [ "${INPUT_RERUN:-false}" = "true" ] && [ "${GITHUB_EVENT_NAME:-}" = "pull_request_target" ]; then
  echo "spec-ctx: rerun refused on pull_request_target, use pull_request or push" >&2
  exit 1
fi
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
# REQ-DIST-010 rerun runs gate --rerun only
if [ "${INPUT_RERUN:-false}" = "true" ]; then
  base=()
  [ -n "${INPUT_BASE:-}" ] && base=(--base "$INPUT_BASE")
  # shellcheck disable=SC2086
  exec $specctx gate $strict --rerun ${base[@]+"${base[@]}"}
fi
$specctx gate $strict --markdown "${INPUT_MARKDOWN:-openspec/**/*.md decisions/*.md *.md}"
