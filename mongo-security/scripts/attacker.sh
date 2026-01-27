#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001}"

echo "1) Legit login (alice/password123)"
curl -sS "${BASE_URL}/login" \
  -H "content-type: application/json" \
  -d '{"username":"alice","password":"password123"}'
echo
echo

echo "2) Injection attempt using MongoDB operators (should succeed in insecure mode, fail in secure mode)"
HTTP_CODE=$(curl -sS -o /tmp/attack_body.json -w "%{http_code}" "${BASE_URL}/login" \
  -H "content-type: application/json" \
  -d '{"username":{"$ne":null},"password":{"$ne":null}}')

echo "HTTP ${HTTP_CODE}"
cat /tmp/attack_body.json
echo
