# Course Mapping

This file maps the demo to course concepts without requiring you to hunt through the code during class.

## Security Concepts / AAA

- **Authentication**: `orders-api.require_jwt()` returns `401` when the caller lacks a valid bearer token.
- **Authorization**: `require_scope()` and `require_role()` return `403` when the authenticated caller lacks permission.
- **Accounting**: both services log request method, path, status, and latency; `orders-api` also exposes basic Prometheus metrics.

## Zero Trust

- **Never trust, always verify**: every protected request validates a JWT; being inside Kubernetes is not enough.
- **Least privilege**: reader tokens can read orders but cannot create orders.
- **Assume breach**: Linkerd mTLS and mesh authorization limit lateral movement between workloads.
- **Continuous validation**: the app checks contextual headers (`X-Device-Trust`, `X-Risk`) on each protected call.

## Authentication and Authorization

- `auth-service` acts as a tiny demo authorization server.
- `orders-api` acts as a protected resource server.
- JWT claims include `iss`, `aud`, `sub`, `role`, `scp`, `exp`, and `jti`.
- The client receives a token, sends it in the `Authorization: Bearer ...` header, and the API validates it.

## JWT

Teaching points:

- JWTs are signed, not encrypted.
- The server validates issuer, audience, expiration, and signature.
- Scopes and roles are claims used for authorization decisions.
- The signing secret is read from environment / Kubernetes Secret instead of being only hardcoded in source.

## TLS / mTLS

- Linkerd automatically adds mTLS between meshed workloads.
- The application code does not change when mTLS is enabled.
- Linkerd service-account identities let you authorize workload-to-workload traffic.

## Threat Modeling prompts

Ask students:

1. What happens if an attacker steals a reader token?
2. What if the attacker changes the `scp` claim from `orders:read` to `orders:write`?
3. What if a malicious pod inside the cluster calls `orders-api` directly?
4. What additional control would you add for high-value transactions?
5. Where should token revocation, refresh tokens, and MFA live in a real architecture?
