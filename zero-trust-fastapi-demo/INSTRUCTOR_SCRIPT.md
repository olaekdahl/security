# Instructor Script

Use this when you want a crisp live flow.

## 0. Setup check

```bash
make check
make cluster
make deploy
```

Open a second terminal:

```bash
make port-forward
```

## 1. Authentication: 401 vs 200

```bash
make app-demo
```

Narration:

> The first protected call has no identity proof, so the API returns 401. Next we ask the auth service for a signed token and present it to the resource server.

Point to code:

- `services/orders_api/main.py` → `require_jwt()`
- `services/auth_service/main.py` → `/token`

## 2. Authorization: 403 vs 201

The demo shows:

- reader can read orders
- reader cannot create orders
- admin can create orders
- reader cannot call admin audit

Narration:

> Authentication only answers “who are you?” Authorization answers “what are you allowed to do?”

Point to code:

- `require_scope("orders:write")`
- `require_role("admin")`

## 3. Conditional access / ABAC

The demo shows:

- managed device → allowed
- missing device posture → denied
- high risk → denied

Narration:

> A token alone is not enough. Zero Trust makes a decision from identity plus context.

Point to code:

- `require_context()`

## 4. mTLS

```bash
make linkerd
make mesh
make mesh-traffic
```

Narration:

> Now the communication between workloads is encrypted and mutually authenticated by the service mesh. We did not add TLS code to FastAPI; the platform layer handled workload-to-workload transport security.

## 5. Micro-segmentation by workload identity

```bash
make mesh-authz
```

Narration:

> The bad client can obtain a valid app token, but it is still blocked before the request reaches the app because the workload identity is not authorized.

This is the most important Zero Trust moment in the demo: **valid app credentials do not imply valid workload path**.
