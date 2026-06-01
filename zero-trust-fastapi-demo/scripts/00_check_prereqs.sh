#!/usr/bin/env bash
set -euo pipefail

missing=0
for cmd in docker kind kubectl python3; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "MISSING: $cmd"
    missing=1
  else
    echo "OK: $cmd -> $(command -v "$cmd")"
  fi
done

if command -v linkerd >/dev/null 2>&1; then
  echo "OK: linkerd -> $(command -v linkerd)"
else
  echo "WARN: linkerd not found. Install before the mTLS stage with: make tools"
fi

if ! docker ps >/dev/null 2>&1; then
  echo "ERROR: docker CLI exists, but cannot talk to Docker Desktop. Enable WSL integration."
  exit 1
fi

if [[ "$missing" -eq 1 ]]; then
  echo "Install missing tools with: make tools"
  exit 1
fi
