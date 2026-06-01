"""Run from inside a Kubernetes client pod with Python available.

Example:
  kubectl -n zt-demo exec -i deploy/demo-client -- python - < scripts/mesh_call.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

AUTH_URL   = os.getenv("AUTH_URL",       "http://auth-service:9000/token")
ORDERS_URL = os.getenv("ORDERS_URL",     "http://orders-api:8000/orders")
USERNAME   = os.getenv("DEMO_USERNAME",  "admin")
PASSWORD   = os.getenv("DEMO_PASSWORD",  "admin-pass")

# ── ANSI colours (stdlib only – works inside the pod) ─────────────────────────
BOLD    = "\033[1m"
CYAN    = "\033[0;36m"
GREEN   = "\033[0;32m"
YELLOW  = "\033[1;33m"
RED     = "\033[0;31m"
DIM     = "\033[2m"
RESET   = "\033[0m"


def _status_colour(code: int) -> str:
    if 200 <= code < 300:
        return GREEN
    if 400 <= code < 500:
        return YELLOW
    if code >= 500:
        return RED
    return ""


def _fmt_status(code: int, label: str) -> str:
    colour = _status_colour(code)
    icon   = "✔" if 200 <= code < 300 else "✖"
    return f"  {colour}{BOLD}{icon}  {label}: {code}{RESET}"


def _fmt_json(text: str, limit: int = 600) -> str:
    snippet = text[:limit]
    try:
        parsed = json.loads(snippet)
        lines  = json.dumps(parsed, indent=2).splitlines()
        return "\n".join(f"  {DIM}{line}{RESET}" for line in lines)
    except (json.JSONDecodeError, ValueError):
        return f"  {DIM}{snippet}{RESET}"


def request(
    method: str,
    url: str,
    body: dict | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, str]:
    data = json.dumps(body).encode() if body is not None else None
    req  = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode(errors="replace")
    except Exception as exc:  # Useful in class when DNS/proxy/policy is broken.
        return 0, f"{type(exc).__name__}: {exc}"


# ── step 1 · authenticate ─────────────────────────────────────────────────────
print(f"\n{CYAN}{BOLD}  ➤  Authenticating as '{USERNAME}'…{RESET}")
status, body = request(
    "POST",
    AUTH_URL,
    {"username": USERNAME, "password": PASSWORD},
    {"Content-Type": "application/json"},
)
print(_fmt_status(status, "auth-service /token"))
if status != 200:
    print(_fmt_json(body))
    sys.exit(1)

token = json.loads(body)["access_token"]
print(f"  {DIM}token: {token[:40]}…{RESET}")

# ── step 2 · call orders API ──────────────────────────────────────────────────
print(f"\n{CYAN}{BOLD}  ➤  Calling orders-api (mTLS in-cluster)…{RESET}")
status, body = request(
    "GET",
    ORDERS_URL,
    headers={
        "Authorization":  f"Bearer {token}",
        "X-Device-Trust": "managed",
        "X-Risk":         "low",
    },
)
print(_fmt_status(status, "orders-api  /orders"))
print(_fmt_json(body))
print()
