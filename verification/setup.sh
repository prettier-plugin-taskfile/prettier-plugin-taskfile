#!/usr/bin/env bash
set -euo pipefail

verification="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
tools="$verification/.tools"
version="4.11.0"
digest="a46a9ff7cdd720f7955854c78e95df13f4cfe6b80691b05f8654fe19e8267179"

if [[ "$(uname -s)" != "Linux" || "$(uname -m)" != "x86_64" ]]; then
  printf '%s\n' "This setup installs the Linux x64 bundle only. See verification/README.md." >&2
  exit 1
fi
for tool in curl unzip sha256sum node npm; do
  if ! command -v "$tool" >/dev/null; then
    printf 'Required setup tool not found: %s\n' "$tool" >&2
    exit 1
  fi
done

mkdir -p "$tools"
if [[ ! -x "$tools/dafny/dafny" ]] ||
    [[ "$("$tools/dafny/dafny" --version)" != "$version"+* ]]; then
  archive="$tools/dafny.zip"
  curl --fail --location --silent --show-error \
    "https://github.com/dafny-lang/dafny/releases/download/v${version}/dafny-${version}-x64-ubuntu-22.04.zip" \
    --output "$archive"
  printf '%s  %s\n' "$digest" "$archive" | sha256sum --check --status
  unzip -q -o "$archive" -d "$tools"
  rm -- "$archive"
fi

if [[ ! -f "$tools/js/node_modules/bignumber.js/package.json" ]] ||
    [[ "$(node -p 'require(process.argv[1]).version' "$tools/js/node_modules/bignumber.js/package.json")" != "9.3.1" ]]; then
  npm install --prefix "$tools/js" --no-save --package-lock=false \
    --ignore-scripts --no-audit --no-fund bignumber.js@9.3.1
fi
"$tools/dafny/dafny" --version
