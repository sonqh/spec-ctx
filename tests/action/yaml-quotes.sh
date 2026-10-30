#!/usr/bin/env bash
# Covers: REQ-DIST-014, SCN-DIST-014-1, SCN-DIST-014-2, SCN-DIST-014-3
# Fails on a description value that holds "${{", quoted or not, and on a plain scalar that holds ": ". No YAML parser is installed.
set -euo pipefail
file=${1:?usage: yaml-quotes.sh <file>}
bad=$(awk '
  /^[ \t]*description:[ \t]/ {
    v = $0
    sub(/^[ \t]*description:[ \t]*/, "", v)
    if (index(v, "${{")) { print FILENAME ":" NR ": expression syntax in description: " v; next }
    if (v ~ /^["\047]/) next
    if (index(v, ": ")) print FILENAME ":" NR ": unquoted description: " v
  }' "$file")
if [ -n "$bad" ]; then
  echo "$bad"
  exit 1
fi
echo "ok: no description holds an expression, and every description with ': ' is quoted"
