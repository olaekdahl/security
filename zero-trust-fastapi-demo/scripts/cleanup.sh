#!/usr/bin/env bash
set -euo pipefail

kind delete cluster --name zt-demo || true
rm -rf .venv
