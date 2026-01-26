import time
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from jose import jwt

app = FastAPI(title="auth-service", version="1.0.0")

# Demo secret. In production: asymmetric keys + JWKS + rotation.
JWT_ISSUER = "demo-auth"
JWT_AUDIENCE = "orders-api"
JWT_SECRET = "dev-secret-change-me"
JWT_ALG = "HS256"
JWT_TTL_SECONDS = 10 * 60

class LoginRequest(BaseModel):
    username: str
    password: str
    role: Literal["reader", "admin"] = "reader"

@app.middleware("http")
async def request_log(request: Request, call_next):
    start = time.time()
    resp = await call_next(request)
    elapsed_ms = int((time.time() - start) * 1000)
    # Keep logs simple for demo visibility
    print(f"{request.method} {request.url.path} -> {resp.status_code} ({elapsed_ms}ms)")
    return resp

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/token")
def token(req: LoginRequest):
    # Demo auth: accept any username with password == "pass"
    if req.password != "pass":
        raise HTTPException(status_code=401, detail="invalid credentials")

    now = int(time.time())
    scopes = ["orders:read"] if req.role == "reader" else ["orders:read", "orders:write"]

    payload = {
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "iat": now,
        "exp": now + JWT_TTL_SECONDS,
        "sub": req.username,
        "role": req.role,
        "scp": scopes,
        # A couple of extra claims to talk about:
        "tenant": "demo-tenant",
    }

    token_str = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
    return {"access_token": token_str, "token_type": "bearer", "expires_in": JWT_TTL_SECONDS}
