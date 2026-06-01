"""
Demo auth service.

This service is intentionally small so students can understand the whole flow:

1. A client presents credentials to /token.
2. The service verifies the user in a tiny in-memory user store.
3. The service signs a JWT that the orders API can validate.

Production warning:
- Do not build your own identity provider for enterprise apps.
- Use Entra ID, Okta, Auth0, Keycloak, or another mature IdP.
- Use MFA, phishing-resistant auth, risk signals, revocation, and key rotation.
"""

from __future__ import annotations

import hmac
import logging
import os
import time
import uuid
from typing import Literal

import jwt
from fastapi import FastAPI, HTTPException, Request, status
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("auth-service")

app = FastAPI(title="auth-service", version="2.0.0")

JWT_ISSUER = os.getenv("JWT_ISSUER", "demo-auth")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "orders-api")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me-this-is-demo-only")
JWT_ALG = os.getenv("JWT_ALG", "HS256")
JWT_TTL_SECONDS = int(os.getenv("JWT_TTL_SECONDS", "600"))

if JWT_SECRET.startswith("dev-secret"):
    log.warning("Using demo JWT secret. Good for class; not acceptable for production.")

# Toy user store. The role and scopes are assigned by the server, not accepted
# from the client request. This avoids accidentally teaching "clients choose
# their own privilege level," which would be an authorization vulnerability.
DEMO_USERS: dict[str, dict[str, object]] = {
    "reader": {
        "password": "reader-pass",
        "role": "reader",
        "scopes": ["orders:read"],
    },
    "admin": {
        "password": "admin-pass",
        "role": "admin",
        "scopes": ["orders:read", "orders:write"],
    },
}


class LoginRequest(BaseModel):
    username: str = Field(examples=["reader", "admin"])
    password: str = Field(examples=["reader-pass", "admin-pass"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


@app.middleware("http")
async def request_log(request: Request, call_next):
    """Minimal accounting: log every request and status code."""
    start = time.time()
    response = await call_next(request)
    elapsed_ms = int((time.time() - start) * 1000)
    log.info("%s %s -> %s (%sms)", request.method, request.url.path, response.status_code, elapsed_ms)
    return response


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


def authenticate(username: str, password: str) -> dict[str, object]:
    """Return a user record or raise 401.

    hmac.compare_digest avoids obvious timing differences for this toy example.
    Real systems should use password hashing and account protections, or better,
    delegate authentication to an enterprise identity provider.
    """
    user = DEMO_USERS.get(username)
    expected_password = str(user.get("password")) if user else ""
    if not user or not hmac.compare_digest(password, expected_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid credentials")
    return user


@app.post("/token", response_model=TokenResponse)
def token(req: LoginRequest) -> TokenResponse:
    user = authenticate(req.username, req.password)
    now = int(time.time())

    payload = {
        # Standard claims used by the resource server for validation.
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "iat": now,
        "nbf": now,
        "exp": now + JWT_TTL_SECONDS,
        "jti": str(uuid.uuid4()),
        "sub": req.username,
        # Demo authorization claims.
        "role": user["role"],
        "scp": user["scopes"],
        "tenant": "demo-tenant",
        "amr": ["pwd"],
    }

    encoded = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
    return TokenResponse(access_token=encoded, expires_in=JWT_TTL_SECONDS)
