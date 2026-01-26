import argparse
import requests

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--user", default="ola")
    p.add_argument("--role", choices=["reader", "admin"], default="reader")
    p.add_argument("--auth-url", default="http://localhost:9000/token")
    args = p.parse_args()

    payload = {"username": args.user, "password": "pass", "role": args.role}
    r = requests.post(args.auth_url, json=payload, timeout=10)
    r.raise_for_status()
    print(r.json()["access_token"])

if __name__ == "__main__":
    main()
