#!/usr/bin/env bash
# Covers: REQ-DIST-008
# The git install step of CI and of scripts/ci-local.sh.
# On GitHub the private repo is read with the job token. Before a push, the local commit is installed through git+file.
set -euo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
sha=$(git -C "$here" rev-parse --short=12 HEAD)
if [ -n "${GITHUB_ACTIONS:-}" ]; then
  if [ -n "${GH_TOKEN:-}" ]; then
    for from in "https://github.com/" "ssh://git@github.com/" "git@github.com:"; do
      git config --global --add url."https://x-access-token:${GH_TOKEN}@github.com/".insteadOf "$from"
    done
  fi
  bash "$here/tests/install/git.sh" "$sha"
else
  SPECCTX_GIT_SPEC="git+file://$here#$sha" bash "$here/tests/install/git.sh" "$sha"
fi
