#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.linkerd2/bin:$PATH"

linkerd check --pre

# Newer Linkerd CLI versions require the Gateway API CRDs to be installed first.
kubectl apply --server-side -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.1/standard-install.yaml

linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -
linkerd check

# Viz is not required for mTLS itself, but it makes live proof much easier.
linkerd viz install | kubectl apply -f -
linkerd viz check
