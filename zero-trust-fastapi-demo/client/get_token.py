"""Get a demo JWT from auth-service and print only the token string."""

from __future__ import annotations

import argparse
import requests


def main() -> None:
    parser = argparse.ArgumentParser(description="Get a demo JWT access token")
    parser.add_argument("--auth-url", default="http://localhost:9000/token")
    parser.add_argument("--username", default="reader", choices=["reader", "admin"])
    parser.add_argument("--password", default=None)
    args = parser.parse_args()

    password = args.password or ("admin-pass" if args.username == "admin" else "reader-pass")
    response = requests.post(
        args.auth_url,
        json={"username": args.username, "password": password},
        timeout=10,
    )
    response.raise_for_status()
    print(response.json()["access_token"])


if __name__ == "__main__":
    main()
