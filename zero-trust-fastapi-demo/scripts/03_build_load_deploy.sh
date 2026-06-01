#!/usr/bin/env bash
set -euo pipefail

kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/demo-secret.yaml

docker build -t auth-service:local services/auth_service
docker build -t orders-api:local services/orders_api

kind load docker-image auth-service:local --name zt-demo
kind load docker-image orders-api:local --name zt-demo

kubectl apply -f k8s/auth.yaml
kubectl apply -f k8s/orders.yaml
kubectl apply -f k8s/demo-clients.yaml

kubectl -n zt-demo rollout status deploy/auth-service
kubectl -n zt-demo rollout status deploy/orders-api
kubectl -n zt-demo rollout status deploy/demo-client
kubectl -n zt-demo rollout status deploy/bad-client
kubectl -n zt-demo get pods
