# Zero Trust FastAPI Demo (WSL + kind + mTLS)

This repo provides a progressive, runnable demo of Zero Trust concepts using:

- Python + FastAPI (request-level authentication + authorization)
- JWTs (identity-first)
- Scopes/RBAC/ABAC-style context checks (least privilege + conditional access)
- kind (local Kubernetes)
- Linkerd (automatic mTLS between services on kind)
- Kubernetes NetworkPolicy (micro-segmentation)

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           kind Kubernetes Cluster                           │
│                                                                             │
│  ┌─────────────────┐         ┌─────────────────┐                            │
│  │  auth-service   │         │   orders-api    │                            │
│  │  (port 9000)    │         │   (port 8000)   │                            │
│  │                 │         │                 │                            │
│  │  POST /token    │         │  GET /orders    │◄── requires orders:read    │
│  │  - issues JWTs  │         │  POST /orders   │◄── requires orders:write   │
│  │  - role-based   │         │  GET /admin/... │◄── requires admin role     │
│  │    scopes       │         │                 │                            │
│  └────────┬────────┘         └────────┬────────┘                            │
│           │                           │                                     │
│           │    Linkerd sidecar (mTLS) │                                     │
│           └───────────────────────────┘                                     │
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │  NetworkPolicy  │ ── only app=client can reach orders-api                │
│  └─────────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
           ▲
           │ port-forward
           │
    ┌──────┴──────┐
    │   Client    │
    │  (Python)   │
    │             │
    │ - get_token │ ── authenticates, gets JWT
    │ - call_*    │ ── sends JWT + context headers
    └─────────────┘
```

---

## Demo

1) **Authentication**: every request must present a valid JWT (401 without / invalid token)
2) **Authorization**:
   - **Scopes**: `orders:read` / `orders:write` (403 if missing)
   - **RBAC**: role-based access (reader vs admin)
   - **ABAC/context**: device posture + risk-based policy (403 if unmanaged / high risk)
3) **Service-to-service Zero Trust** (in cluster):
   - Linkerd mTLS (workload-to-workload encryption + identity)
4) **Micro-segmentation**:
   - NetworkPolicy restricts who can reach `orders-api`

---

## Code Walkthrough

### auth-service (`services/auth_service/main.py`)

The auth service is a minimal token issuer that demonstrates **identity-first** security:

| Endpoint | Purpose |
| ------------- | --------- |
| `POST /token` | Issues JWTs for authenticated users |
| `GET /health` | Kubernetes liveness/readiness probe |

**How it works:**

1. Client sends `{"username": "...", "password": "...", "role": "reader|admin"}`
2. Service validates credentials (demo: any user with password `"pass"`)
3. Returns a signed JWT containing:
   - `sub` (subject) – the username
   - `role` – reader or admin
   - `scp` (scopes) – `["orders:read"]` for readers, `["orders:read", "orders:write"]` for admins
   - `iss`, `aud`, `exp` – issuer, audience, expiry for validation

**Zero Trust principle:** *Identity-first* – every action starts with proving who you are.

---

### orders-api (`services/orders_api/main.py`)

The orders API demonstrates **layered authorization checks**:

| Endpoint | Auth Required | Additional Checks |
| ---------- | --------------- | ------------------- |
| `GET /orders` | JWT with `orders:read` scope | Device trust + risk level |
| `POST /orders` | JWT with `orders:write` scope | Device trust + risk level |
| `GET /admin/audit` | JWT with `admin` role | Device trust + risk level |
| `GET /health` | None | – |
| `GET /metrics` | None | Prometheus metrics |

**Authorization layers (defense in depth):**

```python
# 1. JWT Validation (Authentication)
def require_jwt(creds):
    # Validates token signature, issuer, audience, expiry
    # Returns 401 if missing or invalid

# 2. Scope Check (Least Privilege)
def require_scope(scope):
    # Checks if JWT contains required scope
    # Returns 403 if scope missing

# 3. Role Check (RBAC)
def require_role(role):
    # Checks if JWT role matches required role
    # Returns 403 if role doesn't match

# 4. Context Check (ABAC / Conditional Access)
def require_context(x_device_trust, x_risk):
    # Checks device posture (must be "managed")
    # Checks risk level (must not be "high")
    # Returns 403 if context doesn't meet policy
```

**Zero Trust principles:**

- *Least privilege* – scopes limit what each token can do
- *Conditional access* – context (device, risk) affects authorization decisions
- *Continuous verification* – every request is fully evaluated

---

### Client Scripts (`client/`)

| Script | Purpose | Example |
| -------- | --------- | --------- |
| `get_token.py` | Gets JWT from auth-service | `python3 get_token.py --user ola --role admin` |
| `call_orders_read.py` | Calls `GET /orders` | `TOKEN=... python3 call_orders_read.py` |
| `call_orders_write.py` | Calls `POST /orders` | `TOKEN=... python3 call_orders_write.py` |
| `call_admin_audit.py` | Calls `GET /admin/audit` | `TOKEN=... python3 call_admin_audit.py` |

**Environment variables for context headers:**

- `TOKEN` – the JWT (set in Authorization header)
- `DEVICE_TRUST` – simulates device posture (set as `X-Device-Trust` header)
- `RISK` – simulates risk score (set as `X-Risk` header)

---

### Kubernetes Manifests (`k8s/`)

| File | Purpose |
| ------ | --------- |
| `kind-config.yaml` | Cluster config with port mappings for kind |
| `auth.yaml` | Deployment + Service for auth-service |
| `orders.yaml` | Deployment + Service for orders-api |
| `client.yaml` | Test pod for in-cluster testing |
| `orders-netpol.yaml` | NetworkPolicy for micro-segmentation |

---

## Prereqs (WSL2 on Windows)

- Docker Desktop with WSL integration enabled
- Tools inside WSL: `docker`, `kind`, `kubectl`, `linkerd`, `python3`

Install tools quickly (inside WSL):

```bash
bash scripts/install_tools_wsl.sh
```

---

## Quick start (recommended: go straight to kind)

From repo root:

### 1) Create cluster

```bash
kind create cluster --config k8s/kind-config.yaml
kubectl cluster-info
```

### 2) Build images + load into kind

```bash
docker build -t auth-service:local services/auth_service
docker build -t orders-api:local services/orders_api

kind load docker-image auth-service:local --name zt-demo
kind load docker-image orders-api:local --name zt-demo
```

### 3) Deploy services

```bash
kubectl apply -f k8s/auth.yaml
kubectl apply -f k8s/orders.yaml
kubectl get pods -w
```

### 4) Port-forward for local clients

```bash
kubectl port-forward svc/auth-service 9000:9000 &
kubectl port-forward svc/orders-api 8000:8000 &
```

---

## Stage A: Authentication demo (401 vs 200)

This stage demonstrates the **identity-first** principle: no request is trusted without a valid identity.

### How it works

1. `orders-api` requires a valid JWT on every request (except `/health`)
2. The JWT must be signed with the correct secret and have valid `iss`, `aud`, `exp` claims
3. Without a token → **401 Unauthorized**
4. With valid token → proceed to authorization checks

### 1) Unauthenticated request (expect 401)

```bash
python3 client/call_orders_read.py
# Output: 401 - missing bearer token
```

**Why it fails:** No `Authorization: Bearer <token>` header sent.

### 2) Get token + call (expect 200)

```bash
TOKEN=$(python3 client/get_token.py --user ola --role reader)
TOKEN=$TOKEN DEVICE_TRUST=managed python3 client/call_orders_read.py
# Output: 200 - returns orders list
```

**Why it succeeds:** Valid JWT + compliant device posture.

---

## Stage B: Authorization demos (403 vs 200)

This stage demonstrates **least privilege** and **conditional access**: even with a valid identity, you only get access if you have the right permissions AND context.

### Scope enforcement: writer required for POST /orders

Scopes implement **least privilege** – tokens only grant specific capabilities.

```bash
# Reader token only has orders:read scope
TOKEN=$(python3 client/get_token.py --user r1 --role reader)
TOKEN=$TOKEN DEVICE_TRUST=managed python3 client/call_orders_write.py
# Output: 403 - missing scope: orders:write

# Admin token has orders:read AND orders:write scopes
TOKEN=$(python3 client/get_token.py --user a1 --role admin)
TOKEN=$TOKEN DEVICE_TRUST=managed python3 client/call_orders_write.py
# Output: 200 - order created
```

### RBAC: admin-only endpoint

Role-Based Access Control restricts sensitive operations to specific roles.

```bash
# Reader cannot access admin endpoints
TOKEN=$(python3 client/get_token.py --user r1 --role reader)
TOKEN=$TOKEN DEVICE_TRUST=managed python3 client/call_admin_audit.py
# Output: 403 - requires role: admin

# Admin can access admin endpoints
TOKEN=$(python3 client/get_token.py --user a1 --role admin)
TOKEN=$TOKEN DEVICE_TRUST=managed python3 client/call_admin_audit.py
# Output: 200 - audit log access granted
```

### ABAC / Conditional Access: device posture + risk

Attribute-Based Access Control considers context beyond identity – even admins can be blocked based on device state or risk signals.

```bash
TOKEN=$(python3 client/get_token.py --user ola --role admin)

# Missing device trust header (expect 403)
TOKEN=$TOKEN python3 client/call_orders_read.py
# Output: 403 - device not compliant (expected X-Device-Trust: managed)

# Managed device, low risk (expect 200)
TOKEN=$TOKEN DEVICE_TRUST=managed RISK=low python3 client/call_orders_read.py
# Output: 200 - access granted

# Managed device, high risk (expect 403)
TOKEN=$TOKEN DEVICE_TRUST=managed RISK=high python3 client/call_orders_read.py
# Output: 403 - risk too high (expected X-Risk != high)
```

**Real-world mapping:**

| Demo Header | Real-World Source |
| ----------------- | ------------------- |
| `X-Device-Trust` | MDM/EDR (Intune, CrowdStrike, etc.) |
| `X-Risk` | UEBA, IdP risk engine (Okta, Entra ID) |

---

## Stage C: mTLS demo (Linkerd on kind)

This stage demonstrates **service-to-service Zero Trust**: even inside the cluster, services must prove their identity to each other using mutual TLS.

### What Linkerd provides

- **Automatic mTLS** – all pod-to-pod traffic is encrypted without code changes
- **Workload identity** – each pod gets a cryptographic identity (SPIFFE)
- **Traffic observability** – see who's talking to whom, success rates, latency

### Why it matters

Traditional networks trust anything "inside the firewall." Zero Trust assumes the network is hostile – even internal traffic must be authenticated and encrypted.

**Note**: Linkerd CLI installs to `~/.linkerd2/bin`. Add it to PATH first:

```bash
export PATH=$PATH:$HOME/.linkerd2/bin
# (Or add to ~/.bashrc for persistence)
```

Install Linkerd (Gateway API CRDs → Linkerd CRDs → control plane):

```bash
linkerd check --pre

# 1) Gateway API CRDs (required by Linkerd)
kubectl apply --server-side -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.4.0/standard-install.yaml

# 2) Linkerd CRDs
linkerd install --crds | kubectl apply -f -

# 3) Linkerd control plane
linkerd install | kubectl apply -f -

# 4) Verify
linkerd check
```

(Optional UI)

```bash
linkerd viz install | kubectl apply -f -
linkerd viz dashboard &
```

Inject sidecars (enables mTLS):

```bash
# This adds Linkerd proxy sidecars to all deployments
kubectl get deploy -o yaml | linkerd inject - | kubectl apply -f -
kubectl rollout restart deploy/auth-service deploy/orders-api
kubectl rollout status deploy/auth-service
kubectl rollout status deploy/orders-api
```

Show mTLS status:

```bash
# See traffic stats (should show "meshed" pods)
linkerd -n default stat deploy

# See service-to-service connections with mTLS status
linkerd -n default edges deploy
```

---

## Stage D: Micro-segmentation demo (NetworkPolicy)

This stage demonstrates **network-level Zero Trust**: even with valid identity and mTLS, pods can only reach services they're explicitly allowed to contact.

### What NetworkPolicy provides

- **Default deny** – pods can't communicate unless explicitly allowed
- **Label-based rules** – allow traffic only from pods with specific labels
- **Port-level control** – restrict which ports are accessible

### The policy explained

```yaml
# k8s/orders-netpol.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: orders-api-allow-client-only
spec:
  podSelector:
    matchLabels:
      app: orders-api          # Apply to orders-api pods
  policyTypes:
    - Ingress                  # Control incoming traffic
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: client      # Only allow from pods labeled app=client
      ports:
        - protocol: TCP
          port: 8000           # Only on port 8000
```

Create a client pod:

```bash
kubectl apply -f k8s/client.yaml
kubectl exec -it client -- sh
```

Inside pod (before NetworkPolicy):

```sh
# This works – no restrictions yet
curl -s http://orders-api:8000/health
```

Apply policy to only allow pods labeled `app=client` to reach orders-api:

```bash
kubectl apply -f k8s/orders-netpol.yaml
```

Test again:

```sh
# From client pod (label: app=client) – still works
curl -s http://orders-api:8000/health

# From any other pod without app=client label – blocked!
```

---

## Cleanup

```bash
kind delete cluster --name zt-demo
```

---

## Zero Trust Principles Demonstrated

| Principle | How It's Demonstrated |
| ----------- | ---------------------- |
| **Never trust, always verify** | Every request validated (JWT + context) |
| **Identity-first** | JWTs prove who you are before any access |
| **Least privilege** | Scopes limit what each token can do |
| **Conditional access** | Device posture + risk affect authorization |
| **Assume breach** | mTLS encrypts internal traffic; NetworkPolicy limits blast radius |
| **Continuous verification** | Every request re-evaluated (no session persistence) |

---

## Notes

- JWT secret is a demo value; in real systems use asymmetric keys + JWKS rotation.
- ABAC signals (device/risk) are simulated via headers; in real systems they come from IdP, EDR, and risk engines.
- In production, use a proper secrets management solution (Vault, K8s secrets with encryption at rest).
- Consider adding rate limiting, audit logging, and anomaly detection for defense in depth.
