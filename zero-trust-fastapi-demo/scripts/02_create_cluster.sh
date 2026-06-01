#!/usr/bin/env bash
set -euo pipefail

if kind get clusters | grep -qx 'zt-demo'; then
  echo "kind cluster zt-demo already exists"
else
  kind create cluster --config k8s/kind-config.yaml
fi

kubectl cluster-info
kubectl get nodes
