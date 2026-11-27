#!/usr/bin/env bash
set -euo pipefail

verification="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
dafny="${DAFNY:-$verification/.tools/dafny/dafny}"
if ! command -v "$dafny" >/dev/null; then
  printf '%s\n' "Dafny not found. Run bash verification/setup.sh, or set DAFNY." >&2
  exit 1
fi
export NODE_PATH="$verification/.tools/js/node_modules${NODE_PATH:+:$NODE_PATH}"
if ! node -e 'require("bignumber.js")' >/dev/null; then
  printf '%s\n' "Dafny's JavaScript runtime needs bignumber.js. Run bash verification/setup.sh." >&2
  exit 1
fi

mkdir -p "$verification/generated"
# The build verifies the source; verification is never skipped.
"$dafny" build --target:js \
  --output:"$verification/generated/rename-model" "$verification/RenameModel.dfy"
node --test "$verification/generated-core.test.cjs"
