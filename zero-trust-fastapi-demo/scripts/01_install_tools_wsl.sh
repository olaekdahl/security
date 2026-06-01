#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update -y
sudo apt-get install -y curl ca-certificates python3 python3-venv python3-pip make

case "$(uname -m)" in
  x86_64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $(uname -m)"; exit 1 ;;
esac

# kind: pin by default for repeatable classrooms; override with KIND_VERSION=vX.Y.Z.
KIND_VERSION="${KIND_VERSION:-v0.31.0}"
curl -Lo /tmp/kind "https://kind.sigs.k8s.io/dl/${KIND_VERSION}/kind-linux-${ARCH}"
chmod +x /tmp/kind
sudo mv /tmp/kind /usr/local/bin/kind

# kubectl: use the current stable Kubernetes client and verify checksum.
K8S_VERSION="$(curl -L -s https://dl.k8s.io/release/stable.txt)"
curl -Lo /tmp/kubectl "https://dl.k8s.io/release/${K8S_VERSION}/bin/linux/${ARCH}/kubectl"
curl -Lo /tmp/kubectl.sha256 "https://dl.k8s.io/release/${K8S_VERSION}/bin/linux/${ARCH}/kubectl.sha256"
(cd /tmp && echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check)
sudo install -o root -g root -m 0755 /tmp/kubectl /usr/local/bin/kubectl

# Linkerd edge CLI. You can pin with LINKERD2_VERSION=edge-YY.M.P if needed.
curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install-edge | sh
if ! grep -q 'linkerd2/bin' "$HOME/.bashrc"; then
  echo 'export PATH=$HOME/.linkerd2/bin:$PATH' >> "$HOME/.bashrc"
fi
export PATH="$HOME/.linkerd2/bin:$PATH"

echo "Installed:"
kind version
kubectl version --client=true
linkerd version || true

echo "If linkerd is not found in a new shell, run: source ~/.bashrc"
