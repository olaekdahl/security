# Zero Trust FastAPI Demo v2

A progressive teaching demo for **Secure Coding and Threat Modeling for Software Developers**.

This version is designed for **WSL2 on Windows**, Docker Desktop, kind, Kubernetes, and Linkerd. It walks through Zero Trust security controls in two layers: application-level (authn, authz, RBAC, conditional access) then workload-level (mTLS, mesh authorization). Each layer is a concrete, runnable demo with observable pass/fail outcomes.

---

## The security story

Zero Trust means **never trust, always verify** — on every request, for every caller, at every layer.

This demo builds up that story step by step:

| Stage | `make` target | Security control | What you will see |
|---|---|---|---|
| A | `app-demo` | Authentication | `401` without a token; `401` with a forged token |
| B | `app-demo` | Authorization (scope) | reader `200` on read, `403` on write; admin `201` on write |
| C | `app-demo` | RBAC / least privilege | reader `403` on `/admin/audit`; admin `200` |
| D | `app-demo` | Conditional access / ABAC | unmanaged device → `403`; high-risk context → `403` |
| E | `mesh-traffic` | Workload identity + mTLS | encrypted in-cluster calls; `SECURED` edges in Linkerd |
| F | `mesh-authz` | Micro-segmentation | `demo-client` allowed; `bad-client` blocked by workload identity |
| G | `/metrics` endpoint | Accounting + observability | Prometheus counters for requests, latency, authz denials |

---

## Repo layout

```text
zero-trust-fastapi-demo-v2/
  README.md
  COURSE_MAPPING.md        # maps demo steps to course concepts
  INSTRUCTOR_SCRIPT.md     # cue-card for live delivery
  TROUBLESHOOTING_WSL.md
  Makefile
  client/
    get_token.py           # standalone token helper
    run_demo.py            # app-level demo runner
    requirements.txt
  services/
    auth_service/
      main.py              # demo authorization server — issues JWTs
      requirements.txt
      Dockerfile
    orders_api/
      main.py              # protected resource server — validates JWTs
      requirements.txt
      Dockerfile
  k8s/
    namespace.yaml
    demo-secret.yaml       # JWT secret injected as a Kubernetes Secret
    auth.yaml
    orders.yaml
    demo-clients.yaml      # demo-client (allowed) and bad-client (blocked)
    linkerd-orders-authz.yaml  # Stage F policy manifest
  scripts/
    00_check_prereqs.sh
    01_install_tools_wsl.sh
    02_create_cluster.sh
    03_build_load_deploy.sh
    04_port_forward.sh
    05_run_app_demo.sh      # ← make app-demo
    06_install_linkerd.sh
    07_mesh_workloads.sh
    08_generate_mesh_traffic.sh  # ← make mesh-traffic
    09_apply_linkerd_authorization.sh
    mesh_call.py            # runs inside the pod for the mesh demo
    cleanup.sh
```

---

## WSL2 prerequisites

In Docker Desktop on Windows:

1. Enable **Use the WSL 2 based engine**.
2. Enable WSL integration for your distro under **Settings → Resources → WSL Integration**.

Inside WSL:

```bash
docker version
docker ps
```

Install the CLI tools:

```bash
make tools
source ~/.bashrc
```

Verify everything is in place:

```bash
make check
```

---

## Fast path: bring up the cluster

```bash
make cluster    # create a kind cluster
make deploy     # build images, load into kind, apply k8s manifests
```

Start port-forwarding in a **separate terminal** (leave it running):

```bash
make port-forward
# forwards auth-service → localhost:9000
# forwards orders-api   → localhost:8000
```

---

## `make app-demo` — application-level Zero Trust controls

This demo hits the `orders-api` from your laptop via port-forward and walks through ten scenarios in sequence. Each scenario shows one Zero Trust control working in isolation.

### What is being demonstrated

**Authentication (Steps 1–2): prove who you are**

The `orders-api` uses `require_jwt()` on every protected route. It validates the token's signature, issuer, audience, and expiry — all four must pass or the request is rejected with `401 Unauthorized`.

- Step 1 — No token at all → `401`. The API cannot trust a caller with no identity proof.
- Step 2 — A hand-crafted / tampered token → `401`. The HMAC signature fails because the caller doesn't know the signing key.

> Teaching point: being on the internal network is not authentication. You need a cryptographically signed credential, and even that is validated on every single call.

**Authorization / least privilege (Steps 3–5): authenticated ≠ allowed**

The auth service embeds OAuth-style scopes (`orders:read`, `orders:write`) and a role (`reader` or `admin`) as claims inside the JWT. `orders-api` checks these with `require_scope()` before executing any write operation.

- Step 3 — reader token, GET `/orders` → `200`. The `orders:read` scope is present.
- Step 4 — reader token, POST `/orders` → `403`. The `orders:write` scope is missing. A `403` means the server understood *who* you are, just not *what* you're allowed to do.
- Step 5 — admin token, POST `/orders` → `201`. Admin has both scopes.

> Teaching point: over-provisioned accounts are a persistent attack surface. Scope every token to the minimum privilege required for the operation. If a reader token is stolen, the attacker cannot write data.

**RBAC (Steps 6–7): coarse-grained role separation**

`/admin/audit` is guarded by `require_role("admin")` — a second authorization layer on top of scopes.

- Step 6 — reader token, GET `/admin/audit` → `403`. Role mismatch.
- Step 7 — admin token, GET `/admin/audit` → `200`. Returns an event summary.

> Teaching point: RBAC and scopes are complementary, not alternatives. Scopes restrict *operations*; roles restrict *resource classes*.

**Conditional access / ABAC (Steps 8–9): token + context**

`require_context()` reads two request headers: `X-Device-Trust` (must be `managed`) and `X-Risk` (must not be `high`). In a real system these signals would come from an MDM/EDR system or a risk-scoring engine — the headers are a deliberate simplification for live demos.

- Step 8 — admin token, unmanaged device → `403`. The token is valid, but the device posture check fails.
- Step 9 — admin token, managed device, `X-Risk: high` → `403`. The token and device are fine, but an elevated risk signal triggers a deny.

> Teaching point: identity alone is not a complete access decision. Zero Trust evaluates *identity + device + context* on every request. This is what makes it fundamentally different from perimeter security.

**Claims inspection (Step 10)**

- Step 10 — `GET /debug/whoami` with the admin token → `200`. Returns the decoded JWT claims (`sub`, `role`, `scp`, `iss`, `aud`, `jti`, `exp`).

> Teaching point: JWTs are signed, not encrypted — the claims are readable by anyone who intercepts the token. Never put secrets inside JWT payloads. Notice the server validates the signature; it does not just decode and trust.

### Expected output summary

```
✅  Authentication: no token → cannot read orders          expected 401  →  got 401
✅  Authentication: invalid token → rejected               expected 401  →  got 401
✅  Authorization: reader → can read orders                expected 200  →  got 200
✅  Authorization: reader → cannot create orders           expected 403  →  got 403
✅  Authorization: admin → can create orders               expected 201  →  got 201
✅  RBAC: reader → cannot access admin audit               expected 403  →  got 403
✅  RBAC: admin → can access admin audit                   expected 200  →  got 200
✅  Conditional access: unmanaged device → denied          expected 403  →  got 403
✅  Conditional access: high-risk context → denied         expected 403  →  got 403
✅  Claims: API shows allowed demo claims (whoami)         expected 200  →  got 200
```

### Code pointers

| Concept | File | Function |
|---|---|---|
| Token issuance | `services/auth_service/main.py` | `token()` |
| Authentication | `services/orders_api/main.py` | `require_jwt()` |
| Scope check | `services/orders_api/main.py` | `require_scope()` |
| Role check | `services/orders_api/main.py` | `require_role()` |
| Conditional access | `services/orders_api/main.py` | `require_context()` |
| Claims viewer | `services/orders_api/main.py` | `whoami()` |

---

## `make linkerd` + `make mesh` — adding the mesh layer

Before running the mesh-traffic demo, install Linkerd and inject the sidecar proxies:

```bash
make linkerd    # install Linkerd control plane + Viz extension into the cluster
make mesh       # annotate the zt-demo namespace; rollout-restart injects sidecars
```

What the mesh adds:
- Each pod gets a Linkerd **proxy sidecar** that intercepts all inbound and outbound TCP.
- The control plane issues an **X.509 workload identity certificate** to each proxy, tied to the pod's Kubernetes ServiceAccount.
- All pod-to-pod traffic is upgraded to **mTLS automatically** — no TLS code was added to FastAPI.

---

## `make mesh-traffic` — workload identity and mTLS in action

This demo runs `mesh_call.py` directly inside the `demo-client` pod (not from your laptop) to prove the traffic travels over the mesh, then surfaces the mesh telemetry.

### What is being demonstrated

**Round 1–3: meshed in-cluster calls**

Each round executes the same two-step flow inside the pod:
1. `demo-client` → `auth-service:9000/token` — authenticate and receive a JWT.
2. `demo-client` → `orders-api:8000/orders` — present the JWT; receive order data.

Both calls traverse the mesh. The Linkerd proxies on each side perform mutual TLS handshakes using their workload certificates — neither the application code nor the Kubernetes network policy was changed. mTLS is transparent to the application.

> Teaching point: workload identity comes from the platform (Linkerd + SPIFFE/X.509), not from the application. The same pod that holds a valid app JWT could still be blocked at the transport layer if its workload identity is not authorized.

**Linkerd workload stats**

```bash
linkerd viz -n zt-demo stat deploy
```

Shows per-deployment metrics: requests/sec, success rate, and P50/P95/P99 latency. A success rate of `100.00%` confirms all meshed calls are succeeding and the mTLS handshakes are not interfering with application traffic.

**Linkerd mTLS edges**

```bash
linkerd viz -n zt-demo edges deployment
```

Lists every observed workload-to-workload communication path and whether it is `SECURED` (mTLS) or `NOT_SECURED`. All edges between meshed deployments should show `SECURED`.

> Teaching point: the edges output is auditable proof of which workloads are talking to each other. In a production mesh you can use this to detect unexpected lateral movement paths — not just at the network level, but with workload identity attached to each edge.

### Code pointers

| Concept | File |
|---|---|
| In-cluster meshed call | `scripts/mesh_call.py` |
| Sidecar injection | `scripts/07_mesh_workloads.sh` |
| Mesh traffic generator | `scripts/08_generate_mesh_traffic.sh` |

---

## `make mesh-authz` — micro-segmentation by workload identity

Apply an identity-based Linkerd `AuthorizationPolicy` that allows **only** the `demo-client` ServiceAccount to call `orders-api`:

```bash
make mesh-authz
```

Expected result:

| Caller | Result | Why |
|---|---|---|
| `demo-client` | `200` | ServiceAccount is in the allow-list |
| `bad-client` | `403` | ServiceAccount is not in the allow-list — rejected at the proxy, before the app |

> This is the most important Zero Trust moment in the demo: `bad-client` can obtain a perfectly valid app-layer JWT, but the request is still blocked at the mesh layer because its **workload identity** is not authorized. Valid application credentials do not imply a valid network path.

The policy (`k8s/linkerd-orders-authz.yaml`) uses Linkerd's `Server` and `MeshTLSAuthentication` + `AuthorizationPolicy` resources. The authorization decision is made by the Linkerd proxy, not by any code inside `orders-api`.

---

## Manual client examples

With port-forwarding running:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r client/requirements.txt

# reader — can read, cannot write
TOKEN=$(python client/get_token.py --username reader --password reader-pass)
TOKEN=$TOKEN python client/run_demo.py --single read-orders

# admin — can read and write
TOKEN=$(python client/get_token.py --username admin --password admin-pass)
TOKEN=$TOKEN python client/run_demo.py --single create-order
```

Control demo pacing with `--pause` (seconds between steps):

```bash
python client/run_demo.py --pause 2.0
```

Or via environment variable:

```bash
DEMO_PAUSE=2.0 make app-demo
```

---

## Demo users

| Username | Password | Role | Scopes |
|---|---|---|---|
| `reader` | `reader-pass` | `reader` | `orders:read` |
| `admin` | `admin-pass` | `admin` | `orders:read`, `orders:write` |

The auth service stores these users in memory to keep the demo self-contained. Production systems must use an enterprise IdP (Entra ID, Okta, Keycloak), secure password hashing (bcrypt/Argon2), MFA, phishing-resistant auth methods, account lockout, refresh token rotation, and revocation.

---

## Threat modeling discussion questions

1. What can an attacker do if they steal a `reader` token?
2. What if the attacker modifies the `scp` claim from `orders:read` to `orders:write`? Why doesn't that work here?
3. A malicious pod inside the cluster calls `orders-api` directly with a valid JWT. What stops it at Stage F that doesn't exist at Stage A?
4. The `X-Device-Trust` and `X-Risk` headers are set by the client in this demo. What is the security implication? How would you fix it in production?
5. Where should token revocation, short-lived credentials, and refresh token rotation live in a real architecture?

---

## Cleanup

```bash
make clean
```
