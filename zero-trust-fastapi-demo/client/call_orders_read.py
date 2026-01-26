import os
import subprocess, sys

URL = os.environ.get("URL", "http://localhost:8000/orders")
METHOD = "GET"
TOKEN = os.environ.get("TOKEN", "")

cmd = [sys.executable, os.path.join(os.path.dirname(__file__), "_call.py"), "--url", URL, "--method", METHOD]
if TOKEN:
    cmd += ["--token", TOKEN]

subprocess.run(cmd, check=False)
