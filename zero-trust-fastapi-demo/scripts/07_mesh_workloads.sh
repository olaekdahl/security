#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.linkerd2/bin:$PATH"

kubectl annotate namespace zt-demo linkerd.io/inject=enabled --overwrite
kubectl -n zt-demo rollout restart deploy/auth-service deploy/orders-api deploy/demo-client deploy/bad-client
kubectl -n zt-demo rollout status deploy/auth-service
kubectl -n zt-demo rollout status deploy/orders-api
kubectl -n zt-demo rollout status deploy/demo-client
kubectl -n zt-demo rollout status deploy/bad-client

kubectl -n zt-demo get pods
linkerd check --proxy -n zt-demo
