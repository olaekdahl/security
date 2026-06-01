#!/usr/bin/env bash
set -euo pipefail

# ── colour helpers ────────────────────────────────────────────────────────────
BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
DIM='\033[2m'
RESET='\033[0m'

step() { echo -e "\n${CYAN}${BOLD}▶  $*${RESET}"; }
ok()   { echo -e "${GREEN}✔${RESET}  $*"; }
dim()  { echo -e "${DIM}$*${RESET}"; }

# ── banner ────────────────────────────────────────────────────────────────────
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Zero Trust FastAPI Demo  🔒        ║"
echo "  ║   authn · authz · RBAC · condaccess  ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${RESET}"

# ── setup ─────────────────────────────────────────────────────────────────────
step "Preparing Python environment"
dim "  python3 -m venv .venv"
python3 -m venv .venv
source .venv/bin/activate

dim "  pip install -r client/requirements.txt"
pip install --quiet -r client/requirements.txt
ok "Environment ready"

# ── run demo ──────────────────────────────────────────────────────────────────
step "Running demo scenarios"
echo
python client/run_demo.py "$@"
