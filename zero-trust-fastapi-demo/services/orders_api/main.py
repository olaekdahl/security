"""
Orders API: protected resource server for the Zero Trust demo.

The important teaching split:
- 401 Unauthorized = authentication failed or missing.
- 403 Forbidden = authentication succeeded, but authorization or policy failed.

This file intentionally uses plain functions instead of a framework-specific
security package so the class can see each decision point.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Callable

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from prometheus_client import Counter, Histogram, generate_latest
from starlette.responses import Response

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("orders-api")

app = FastAPI(title="orders-api", version="2.0.0")

JWT_ISSUER = os.getenv("JWT_ISSUER", "demo-auth")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "orders-api")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me-this-is-demo-only")
JWT_ALG = os.getenv("JWT_ALG", "HS256")

# auto_error=False lets us return our own clear 401 response for teaching.
bearer = HTTPBearer(auto_error=False)

REQUESTS = Counter("zt_requests_total", "Total HTTP requests", ["path", "method", "status"])
LATENCY = Histogram("zt_request_latency_seconds", "HTTP request latency", ["path"])
AUTHZ_DENIALS = Counter("zt_authorization_denials_total", "Authorization denials", ["reason"])

ORDERS: list[dict[str, object]] = [
    {"id": "A100", "total": 42.50, "classification": "internal"},
    {"id": "B200", "total": 13.37, "classification": "confidential"},
]


@app.middleware("http")
async def observability_and_headers(request: Request, call_next):
    """Accounting + lightweight response hardening.

    The headers are not the main point of the demo, but they let you connect to
    HTTP security header discussions later in the course.
    """
    start = time.time()
    response = await call_next(request)
    elapsed = time.time() - start

    REQUESTS.labels(path=request.url.path, method=request.method, status=str(response.status_code)).inc()
    LATENCY.labels(path=request.url.path).observe(elapsed)

    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Cache-Control", "no-store")

    log.info("%s %s -> %s (%sms)", request.method, request.url.path, response.status_code, int(elapsed * 1000))
    return response


@app.get("/health")
def health() -> dict[str, bool]:
    # Kept public so Kubernetes/Linkerd demos have a simple liveness target.
    return {"ok": True}


@app.get("/metrics")
def metrics() -> Response:
    # In production, protect metrics endpoints or expose them only inside a
    # trusted observability plane.
    return Response(generate_latest(), media_type="text/plain; version=0.0.4")


def deny(status_code: int, detail: str, reason: str) -> None:
    if status_code == 403:
        AUTHZ_DENIALS.labels(reason=reason).inc()
    raise HTTPException(status_code=status_code, detail=detail)


def require_jwt(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict[str, Any]:
    """Authentication control.

    Validates that the caller has a bearer token that:
    - was signed with the expected key,
    - was issued by the expected issuer,
    - is intended for this API audience,
    - has not expired.
    """
    if creds is None:
        deny(401, "missing bearer token", "missing_token")

    try:
        return jwt.decode(
            creds.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALG],
            audience=JWT_AUDIENCE,
            issuer=JWT_ISSUER,
            options={"require": ["exp", "iat", "nbf", "iss", "aud", "sub"]},
        )
    except InvalidTokenError:
        deny(401, "invalid token", "invalid_token")


def require_scope(scope: str) -> Callable[[dict[str, Any]], dict[str, Any]]:
    """Authorization control based on OAuth-style scopes."""

    def _check(user: dict[str, Any] = Depends(require_jwt)) -> dict[str, Any]:
        scopes = user.get("scp", [])
        if scope not in scopes:
            deny(403, f"missing scope: {scope}", "missing_scope")
        return user

    return _check


def require_role(role: str) -> Callable[[dict[str, Any]], dict[str, Any]]:
    """Authorization control based on a coarse-grained role."""

    def _check(user: dict[str, Any] = Depends(require_jwt)) -> dict[str, Any]:
        if user.get("role") != role:
            deny(403, f"requires role: {role}", "wrong_role")
        return user

    return _check


def require_context(
    x_device_trust: str | None = Header(default=None),
    x_risk: str | None = Header(default=None),
) -> bool:
    """Conditional access / ABAC-style policy.

    Real systems would source these signals from an IdP, EDR/MDM, or risk engine.
    Headers are used here only because they are easy to demonstrate live.
    """
    if x_device_trust != "managed":
        deny(403, "device not compliant (expected X-Device-Trust: managed)", "unmanaged_device")
    if x_risk == "high":
        deny(403, "risk too high (expected X-Risk != high)", "high_risk")
    return True


@app.get("/debug/whoami")
def whoami(user: dict[str, Any] = Depends(require_jwt)) -> dict[str, Any]:
    """Demo-only endpoint to show decoded claims.

    It does not reveal the signing key and does not prove authorization. It only
    helps students see the claims being used by the authorization functions.
    """
    allowed_keys = ["sub", "role", "scp", "iss", "aud", "tenant", "amr", "exp", "jti"]
    return {key: user.get(key) for key in allowed_keys}


@app.get("/orders")
def list_orders(
    user: dict[str, Any] = Depends(require_scope("orders:read")),
    _ctx: bool = Depends(require_context),
) -> dict[str, object]:
    return {
        "caller": {"sub": user.get("sub"), "role": user.get("role"), "scp": user.get("scp")},
        "orders": ORDERS,
    }


@app.post("/orders", status_code=201)
def create_order(
    user: dict[str, Any] = Depends(require_scope("orders:write")),
    _ctx: bool = Depends(require_context),
) -> dict[str, object]:
    new_id = f"X{len(ORDERS) + 1:03d}"
    order = {"id": new_id, "total": 9.99, "classification": "internal"}
    ORDERS.append(order)
    return {"ok": True, "created": order, "created_by": user.get("sub")}


@app.get("/admin/audit")
def admin_audit(
    user: dict[str, Any] = Depends(require_role("admin")),
    _ctx: bool = Depends(require_context),
) -> dict[str, object]:
    return {
        "ok": True,
        "message": "audit log access granted",
        "caller": {"sub": user.get("sub"), "role": user.get("role")},
        "events": [
            {"event": "orders_read", "count": 123},
            {"event": "orders_write", "count": 7},
            {"event": "authorization_denied", "count": "see /metrics"},
        ],
    }
