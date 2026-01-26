import time
from typing import Any, Callable

from fastapi import FastAPI, Depends, HTTPException, Header, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from prometheus_client import Counter, Histogram, generate_latest
from starlette.responses import Response

app = FastAPI(title="orders-api", version="1.0.0")

JWT_ISSUER = "demo-auth"
JWT_AUDIENCE = "orders-api"
JWT_SECRET = "dev-secret-change-me"
JWT_ALG = "HS256"

bearer = HTTPBearer(auto_error=False)

# Minimal observability to reinforce "continuous verification"
REQUESTS = Counter("zt_requests_total", "Total requests", ["path", "method", "status"])
LATENCY = Histogram("zt_request_latency_seconds", "Request latency seconds", ["path"])

ORDERS = [
    {"id": "A100", "total": 42.50},
    {"id": "B200", "total": 13.37},
]

@app.middleware("http")
async def metrics_and_log(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    elapsed = time.time() - start

    REQUESTS.labels(path=request.url.path, method=request.method, status=str(response.status_code)).inc()
    LATENCY.labels(path=request.url.path).observe(elapsed)

    elapsed_ms = int(elapsed * 1000)
    print(f"{request.method} {request.url.path} -> {response.status_code} ({elapsed_ms}ms)")
    return response

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type="text/plain; version=0.0.4")

@app.get("/health")
def health():
    return {"ok": True}

def require_jwt(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict[str, Any]:
    if creds is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token")

    token_str = creds.credentials
    try:
        payload = jwt.decode(
            token_str,
            JWT_SECRET,
            algorithms=[JWT_ALG],
            audience=JWT_AUDIENCE,
            issuer=JWT_ISSUER,
        )
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")

def require_scope(scope: str) -> Callable[[dict[str, Any]], dict[str, Any]]:
    def _check(user: dict[str, Any] = Depends(require_jwt)) -> dict[str, Any]:
        scopes = user.get("scp", [])
        if scope not in scopes:
            raise HTTPException(status_code=403, detail=f"missing scope: {scope}")
        return user
    return _check

def require_role(role: str) -> Callable[[dict[str, Any]], dict[str, Any]]:
    def _check(user: dict[str, Any] = Depends(require_jwt)) -> dict[str, Any]:
        if user.get("role") != role:
            raise HTTPException(status_code=403, detail=f"requires role: {role}")
        return user
    return _check

def require_context(
    x_device_trust: str | None = Header(default=None),
    x_risk: str | None = Header(default=None),
) -> bool:
    # Demo Conditional Access:
    # - must be managed device
    # - deny if risk is high
    if x_device_trust != "managed":
        raise HTTPException(status_code=403, detail="device not compliant (expected X-Device-Trust: managed)")
    if x_risk == "high":
        raise HTTPException(status_code=403, detail="risk too high (expected X-Risk != high)")
    return True

@app.get("/orders")
def list_orders(
    user: dict[str, Any] = Depends(require_scope("orders:read")),
    _ctx: bool = Depends(require_context),
):
    return {
        "caller": {"sub": user.get("sub"), "role": user.get("role"), "scp": user.get("scp"), "tenant": user.get("tenant")},
        "orders": ORDERS,
    }

@app.post("/orders")
def create_order(
    user: dict[str, Any] = Depends(require_scope("orders:write")),
    _ctx: bool = Depends(require_context),
):
    # Minimal "write" action for demo
    new_id = f"X{len(ORDERS)+1:03d}"
    ORDERS.append({"id": new_id, "total": 9.99})
    return {"ok": True, "created": new_id, "created_by": user.get("sub")}

@app.get("/admin/audit")
def admin_audit(
    user: dict[str, Any] = Depends(require_role("admin")),
    _ctx: bool = Depends(require_context),
):
    # Demo "sensitive endpoint" protected by RBAC
    return {
        "ok": True,
        "message": "audit log access granted",
        "caller": {"sub": user.get("sub"), "role": user.get("role")},
        "events": [
            {"event": "orders_read", "count": 123},
            {"event": "orders_write", "count": 7},
        ],
    }
