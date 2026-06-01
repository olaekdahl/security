#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.linkerd2/bin:$PATH"

# ── colour helpers ────────────────────────────────────────────────────────────
BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
MAGENTA='\033[0;35m'
YELLOW='\033[1;33m'
DIM='\033[2m'
RESET='\033[0m'

banner() {
  echo -e "\n${CYAN}${BOLD}══════════════════════════════════════════${RESET}"
  echo -e "${CYAN}${BOLD}  $*${RESET}"
  echo -e "${CYAN}${BOLD}══════════════════════════════════════════${RESET}\n"
}

section() { echo -e "\n${MAGENTA}${BOLD}▶  $*${RESET}"; }
dim()     { echo -e "${DIM}   $*${RESET}"; }

# ── banner ────────────────────────────────────────────────────────────────────
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   Zero Trust – Mesh Traffic Demo  🕸️      ║"
echo "  ║   mTLS in-cluster calls via Linkerd       ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${RESET}"

# ── meshed calls ──────────────────────────────────────────────────────────────
section "Running meshed demo-client calls (3 rounds)"
dim "kubectl -n zt-demo exec deploy/demo-client -- python - < scripts/mesh_call.py"
echo

TOTAL=3
for i in $(seq 1 $TOTAL); do
  echo -e "${CYAN}${BOLD}┌─ Round $i / $TOTAL ─────────────────────────────────────┐${RESET}"
  kubectl -n zt-demo exec -i deploy/demo-client -- python - < scripts/mesh_call.py
  echo -e "${CYAN}${BOLD}└────────────────────────────────────────────────────────┘${RESET}"
  [[ $i -lt $TOTAL ]] && sleep 1
done

# ── linkerd stats ─────────────────────────────────────────────────────────────
section "Linkerd workload stats (RPS · success-rate · latency)"
dim "linkerd viz -n zt-demo stat deploy"
echo
linkerd viz -n zt-demo stat deploy || echo -e "${YELLOW}⚠  linkerd viz not available – skipping${RESET}"

# ── mtls edges ────────────────────────────────────────────────────────────────
section "Linkerd mTLS edges (verified mutual TLS between workloads)"
dim "linkerd viz -n zt-demo edges deployment"
echo
linkerd viz -n zt-demo edges deployment || echo -e "${YELLOW}⚠  linkerd viz not available – skipping${RESET}"

echo -e "\n${GREEN}${BOLD}✔  Mesh traffic demo complete${RESET}\n"
