#!/usr/bin/env bash
set -euo pipefail

echo "=== Zero Trust Demo: WSL Tool Installer ==="

# Basic deps (always ensure these are present)
echo "[*] Ensuring basic dependencies..."
sudo apt-get update -y
sudo apt-get install -y curl ca-certificates unzip python3 python3-venv python3-pip

# kind
KIND_VERSION="v0.23.0"
if command -v kind &>/dev/null; then
  INSTALLED_KIND=$(kind version | grep -oP 'v[\d.]+' | head -1 || echo "unknown")
  echo "[✓] kind already installed ($INSTALLED_KIND)"
else
  echo "[*] Installing kind ${KIND_VERSION}..."
  curl -Lo kind "https://kind.sigs.k8s.io/dl/${KIND_VERSION}/kind-linux-amd64"
  chmod +x kind
  sudo mv kind /usr/local/bin/kind
  echo "[✓] kind installed"
fi

# kubectl
KUBECTL_VERSION="v1.30.5"
if command -v kubectl &>/dev/null; then
  INSTALLED_KUBECTL=$(kubectl version --client -o json 2>/dev/null | grep -oP '"gitVersion":\s*"\K[^"]+' || echo "unknown")
  echo "[✓] kubectl already installed ($INSTALLED_KUBECTL)"
else
  echo "[*] Installing kubectl ${KUBECTL_VERSION}..."
  curl -Lo kubectl "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
  chmod +x kubectl
  sudo mv kubectl /usr/local/bin/kubectl
  echo "[✓] kubectl installed"
fi

# linkerd
if command -v linkerd &>/dev/null || [[ -x "$HOME/.linkerd2/bin/linkerd" ]]; then
  INSTALLED_LINKERD=$("$HOME/.linkerd2/bin/linkerd" version --client --short 2>/dev/null || linkerd version --client --short 2>/dev/null || echo "unknown")
  echo "[✓] linkerd already installed ($INSTALLED_LINKERD)"
else
  echo "[*] Installing linkerd CLI..."
  curl -sL https://run.linkerd.io/install | sh
  echo "[✓] linkerd installed"
fi

# Ensure linkerd is in PATH
if ! grep -q "linkerd2/bin" ~/.bashrc; then
  echo 'export PATH=$PATH:$HOME/.linkerd2/bin' >> ~/.bashrc
  echo "[*] Added linkerd to PATH in ~/.bashrc"
fi

echo ""
echo "=== Installation Summary ==="
echo "kind:    $(command -v kind &>/dev/null && kind version 2>/dev/null | head -1 || echo 'not found')"
echo "kubectl: $(command -v kubectl &>/dev/null && kubectl version --client --short 2>/dev/null || echo 'not found')"
echo "linkerd: $($HOME/.linkerd2/bin/linkerd version --client --short 2>/dev/null || echo 'not found (run: source ~/.bashrc)')"
echo ""
echo "If linkerd is not found, run: source ~/.bashrc"
