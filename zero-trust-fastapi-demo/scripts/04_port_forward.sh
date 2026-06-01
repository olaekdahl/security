#!/usr/bin/env bash
set -euo pipefail

echo "Forwarding auth-service -> http://localhost:9000"
echo "Forwarding orders-api   -> http://localhost:8000"
echo "Press Ctrl+C to stop."

kubectl -n zt-demo port-forward svc/auth-service 9000:9000 &
AUTH_PID=$!
kubectl -n zt-demo port-forward svc/orders-api 8000:8000 &
ORDERS_PID=$!
trap 'kill $AUTH_PID $ORDERS_PID 2>/dev/null || true' EXIT
wait
