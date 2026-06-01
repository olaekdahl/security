#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.linkerd2/bin:$PATH"

kubectl apply -f k8s/linkerd-orders-authz.yaml
sleep 2

echo "--- allowed workload identity: demo-client -> orders-api should be 200 ---"
kubectl -n zt-demo exec -i deploy/demo-client -- python - < scripts/mesh_call.py

echo "--- blocked workload identity: bad-client -> orders-api should be 403 ---"
set +e
kubectl -n zt-demo exec -i deploy/bad-client -- python - < scripts/mesh_call.py
BAD_STATUS=$?
set -e

echo "bad-client command exit status: $BAD_STATUS"
echo "If the bad-client orders status is 403, the mesh authorization demo worked."

echo "--- policy resources ---"
kubectl -n zt-demo get server,authorizationpolicy
