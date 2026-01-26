import os
import argparse
import requests

def build_headers(token: str):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    device = os.environ.get("DEVICE_TRUST", "")
    risk = os.environ.get("RISK", "")
    if device:
        headers["X-Device-Trust"] = device
    if risk:
        headers["X-Risk"] = risk
    return headers

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--url", required=True)
    p.add_argument("--method", choices=["GET", "POST"], default="GET")
    p.add_argument("--token", default=os.environ.get("TOKEN", ""))
    args = p.parse_args()

    headers = build_headers(args.token)

    if args.method == "GET":
        r = requests.get(args.url, headers=headers, timeout=10)
    else:
        r = requests.post(args.url, headers=headers, timeout=10)

    print(r.status_code)
    print(r.text)

if __name__ == "__main__":
    main()
