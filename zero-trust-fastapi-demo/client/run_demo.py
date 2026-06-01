"""Run the application-level authentication/authorization demo.

This script assumes you have port-forwarding running:
  kubectl -n zt-demo port-forward svc/auth-service 9000:9000
  kubectl -n zt-demo port-forward svc/orders-api 8000:8000
"""

from __future__ import annotations

import argparse
import json
import os
import time
from dataclasses import dataclass, field
from typing import Callable

import requests
from rich import box
from rich.console import Console
from rich.panel import Panel
from rich.rule import Rule
from rich.syntax import Syntax
from rich.table import Table
from rich.text import Text

console = Console()

PAUSE_BETWEEN_STEPS = float(os.getenv("DEMO_PAUSE", "0.6"))


# ── colour helpers ────────────────────────────────────────────────────────────

STATUS_COLOUR = {2: "green", 4: "yellow", 5: "red"}


def _status_colour(code: int) -> str:
    return STATUS_COLOUR.get(code // 100, "white")


def _format_body(text: str, limit: int = 600) -> str:
    snippet = text[:limit]
    try:
        parsed = json.loads(snippet)
        return json.dumps(parsed, indent=2)
    except (json.JSONDecodeError, ValueError):
        return snippet


# ── network helpers ───────────────────────────────────────────────────────────

@dataclass
class DemoContext:
    auth_url: str
    orders_base_url: str
    reader_token: str | None = None
    admin_token: str | None = None
    results: list[tuple[str, bool]] = field(default_factory=list)


def token(ctx: DemoContext, username: str, password: str) -> str:
    with console.status(f"[cyan]Fetching token for [bold]{username}[/bold]…"):
        response = requests.post(
            f"{ctx.auth_url}/token",
            json={"username": username, "password": password},
            timeout=10,
        )
    response.raise_for_status()
    console.print(f"  [green]✔[/green] Token acquired for [bold]{username}[/bold]")
    return response.json()["access_token"]


def call(
    method: str,
    url: str,
    token_value: str | None = None,
    managed: bool = True,
    risk: str | None = None,
) -> requests.Response:
    headers: dict[str, str] = {}
    if token_value:
        headers["Authorization"] = f"Bearer {token_value}"
    if managed:
        headers["X-Device-Trust"] = "managed"
    if risk:
        headers["X-Risk"] = risk
    return requests.request(method, url, headers=headers, timeout=10)


# ── display helpers ───────────────────────────────────────────────────────────

_step_counter = 0


def show(ctx: DemoContext, step: str, expected: int, response: requests.Response) -> None:
    global _step_counter
    _step_counter += 1

    passed = response.status_code == expected
    ctx.results.append((step, passed))

    icon = "[bold green]✅  PASS[/bold green]" if passed else "[bold red]❌  FAIL[/bold red]"
    status_color = _status_colour(response.status_code)
    expected_color = _status_colour(expected)

    console.print(Rule(f"[bold cyan]Step {_step_counter}[/bold cyan]", style="cyan"))
    console.print(f"  {icon}  [bold]{step}[/bold]")

    status_line = Text()
    status_line.append("  expected ", style="dim")
    status_line.append(str(expected), style=f"bold {expected_color}")
    status_line.append("  →  got ", style="dim")
    status_line.append(str(response.status_code), style=f"bold {status_color}")
    console.print(status_line)

    body = _format_body(response.text)
    if body.startswith("{") or body.startswith("["):
        console.print(Syntax(body, "json", theme="monokai", word_wrap=True))
    else:
        console.print(f"  [dim]{body}[/dim]")

    if PAUSE_BETWEEN_STEPS > 0:
        time.sleep(PAUSE_BETWEEN_STEPS)


def print_summary(results: list[tuple[str, bool]]) -> None:
    console.print(Rule("[bold white]Demo Summary[/bold white]", style="white"))

    table = Table(box=box.ROUNDED, show_header=True, header_style="bold cyan")
    table.add_column("#", style="dim", width=3)
    table.add_column("Scenario", min_width=45)
    table.add_column("Result", justify="center", width=8)

    passed = sum(1 for _, ok in results if ok)
    for i, (step, ok) in enumerate(results, 1):
        result_text = "[green]PASS[/green]" if ok else "[red]FAIL[/red]"
        table.add_row(str(i), step, result_text)

    console.print(table)
    colour = "green" if passed == len(results) else "yellow"
    console.print(
        Panel(
            f"[{colour}][bold]{passed}/{len(results)} scenarios passed[/bold][/{colour}]",
            expand=False,
            border_style=colour,
        )
    )


# ── demo scenarios ────────────────────────────────────────────────────────────

def ensure_tokens(ctx: DemoContext) -> None:
    console.print(Rule("[bold cyan]Acquiring Tokens[/bold cyan]", style="cyan"))
    ctx.reader_token = ctx.reader_token or token(ctx, "reader", "reader-pass")
    ctx.admin_token = ctx.admin_token or token(ctx, "admin", "admin-pass")
    console.print()


def run_all(ctx: DemoContext) -> None:
    ensure_tokens(ctx)

    show(ctx, "Authentication: no token → cannot read orders",           401, call("GET",  f"{ctx.orders_base_url}/orders",        None))
    show(ctx, "Authentication: invalid token → rejected",                401, call("GET",  f"{ctx.orders_base_url}/orders",        "not-a-real-token"))
    show(ctx, "Authorization: reader → can read orders",                 200, call("GET",  f"{ctx.orders_base_url}/orders",        ctx.reader_token))
    show(ctx, "Authorization: reader → cannot create orders",            403, call("POST", f"{ctx.orders_base_url}/orders",        ctx.reader_token))
    show(ctx, "Authorization: admin → can create orders",                201, call("POST", f"{ctx.orders_base_url}/orders",        ctx.admin_token))
    show(ctx, "RBAC: reader → cannot access admin audit",                403, call("GET",  f"{ctx.orders_base_url}/admin/audit",   ctx.reader_token))
    show(ctx, "RBAC: admin → can access admin audit",                    200, call("GET",  f"{ctx.orders_base_url}/admin/audit",   ctx.admin_token))
    show(ctx, "Conditional access: unmanaged device → denied",           403, call("GET",  f"{ctx.orders_base_url}/orders",        ctx.admin_token, managed=False))
    show(ctx, "Conditional access: high-risk context → denied",          403, call("GET",  f"{ctx.orders_base_url}/orders",        ctx.admin_token, managed=True, risk="high"))
    show(ctx, "Claims: API shows allowed demo claims (whoami)",           200, call("GET",  f"{ctx.orders_base_url}/debug/whoami",  ctx.admin_token))

    console.print()
    print_summary(ctx.results)


def run_single(ctx: DemoContext, name: str) -> None:
    ensure_tokens(ctx)
    demos: dict[str, Callable[[], requests.Response]] = {
        "read-orders":  lambda: call("GET",  f"{ctx.orders_base_url}/orders",       os.getenv("TOKEN") or ctx.reader_token),
        "create-order": lambda: call("POST", f"{ctx.orders_base_url}/orders",       os.getenv("TOKEN") or ctx.admin_token),
        "admin-audit":  lambda: call("GET",  f"{ctx.orders_base_url}/admin/audit",  os.getenv("TOKEN") or ctx.admin_token),
        "whoami":       lambda: call("GET",  f"{ctx.orders_base_url}/debug/whoami", os.getenv("TOKEN") or ctx.reader_token),
    }
    response = demos[name]()
    status_color = _status_colour(response.status_code)
    console.print(f"[bold {status_color}]{response.status_code}[/bold {status_color}]")
    body = _format_body(response.text)
    if body.startswith("{") or body.startswith("["):
        console.print(Syntax(body, "json", theme="monokai", word_wrap=True))
    else:
        console.print(body)


# ── entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Run Zero Trust authn/authz demo")
    parser.add_argument("--auth-base-url",    default="http://localhost:9000")
    parser.add_argument("--orders-base-url",  default="http://localhost:8000")
    parser.add_argument("--pause",            type=float, default=None,
                        help="Seconds to pause between steps (default: DEMO_PAUSE env var or 0.6)")
    parser.add_argument("--single", choices=["read-orders", "create-order", "admin-audit", "whoami"])
    args = parser.parse_args()

    global PAUSE_BETWEEN_STEPS
    if args.pause is not None:
        PAUSE_BETWEEN_STEPS = args.pause

    console.print(
        Panel.fit(
            "[bold cyan]Zero Trust FastAPI Demo[/bold cyan]\n"
            "[dim]authn · authz · RBAC · conditional access · claims[/dim]",
            border_style="cyan",
            padding=(1, 4),
        )
    )
    console.print()

    ctx = DemoContext(auth_url=args.auth_base_url, orders_base_url=args.orders_base_url)
    if args.single:
        run_single(ctx, args.single)
    else:
        run_all(ctx)


if __name__ == "__main__":
    main()
